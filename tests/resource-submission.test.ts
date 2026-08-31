import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAX_RESOURCE_FILE_SIZE,
  buildResourceContentDisposition,
  inferResourceType,
  isResourceImageFileName,
  normalizeResourceMimeType,
  sanitizeFileName,
  validateResourceFile,
} from "../server/utils/upload.ts";
import { resolveMarkdownImageSources } from "../server/utils/resource-markdown.ts";
import { streamR2Object, toR2ObjectBody } from "../server/utils/r2.ts";
import {
  getResourceFileUrl,
  validateResourceUrl,
} from "../server/utils/resources.ts";
import { renderMarkdown } from "../server/utils/minutes.ts";

test("resource file helpers validate allowed files and infer resource types", () => {
  assert.equal(inferResourceType({ url: "https://example.com/doc" }), "URL");
  assert.equal(inferResourceType({ fileName: "deck.pptx" }), "PowerPoint");
  assert.equal(inferResourceType({ fileName: "notes.md" }), "Markdown");
  assert.equal(inferResourceType({ fileName: "sample.html" }), "HTML");
  assert.equal(inferResourceType({ fileName: "archive.zip" }), "ZIP");
  assert.equal(getResourceFileUrl(10, "notes.md"), "/resources/10");
  assert.equal(getResourceFileUrl(10, "sample.html"), "/api/resources/10/file");
  assert.equal(getResourceFileUrl(10, "deck.pdf"), "/api/resources/10/file");
  assert.equal(normalizeResourceMimeType("notes.md", "application/octet-stream"), "text/markdown; charset=utf-8");
  assert.equal(normalizeResourceMimeType("deck.pdf", "application/pdf"), "application/pdf");
  assert.equal(sanitizeFileName("../demo deck.pdf"), "demo deck.pdf");
  assert.equal(sanitizeFileName("../営業資料.pptx"), "営業資料.pptx");
  assert.equal(
    buildResourceContentDisposition("営業資料.pptx"),
    `inline; filename="____.pptx"; filename*=UTF-8''%E5%96%B6%E6%A5%AD%E8%B3%87%E6%96%99.pptx`,
  );
  assert.equal(
    buildResourceContentDisposition("sample.html"),
    `attachment; filename="sample.html"; filename*=UTF-8''sample.html`,
  );
  assert.equal(
    buildResourceContentDisposition("sample.html", { htmlInline: true }),
    `inline; filename="sample.html"; filename*=UTF-8''sample.html`,
  );
  assert.equal(
    buildResourceContentDisposition("deck.pdf", { htmlInline: true }),
    `inline; filename="deck.pdf"; filename*=UTF-8''deck.pdf`,
  );

  assert.doesNotThrow(() =>
    validateResourceFile({
      fileName: "deck.pdf",
      size: 1024,
      mimeType: "application/pdf",
    }),
  );

  assert.doesNotThrow(() =>
    validateResourceFile({
      fileName: "notes.md",
      size: 1024,
      mimeType: "text/markdown; charset=utf-8",
    }),
  );

  assert.doesNotThrow(() =>
    validateResourceFile({
      fileName: "sample.html",
      size: 1024,
      mimeType: "text/html",
    }),
  );

  assert.doesNotThrow(() =>
    validateResourceFile({
      fileName: "archive.zip",
      size: 1024,
      mimeType: "application/zip",
    }),
  );

  assert.throws(() =>
    validateResourceFile({
      fileName: "script.exe",
      size: 1024,
      mimeType: "application/octet-stream",
    }),
  );

  assert.throws(() =>
    validateResourceFile({
      fileName: "large.pdf",
      size: MAX_RESOURCE_FILE_SIZE + 1,
      mimeType: "application/pdf",
    }),
  );
});

function createR2Event(fileKeys: string[], objectExtras: Record<string, unknown> = {}) {
  const bucket = {
    async put() {},
    async get(key: string) {
      if (!fileKeys.includes(key)) return null;
      return { body: new Response("<html></html>").body!, ...objectExtras };
    },
    async delete() {},
  };
  return { context: { cloudflare: { env: { RESOURCES_BUCKET: bucket } } } } as unknown as Parameters<typeof streamR2Object>[0];
}

test("streamR2Object serves HTML as a sandboxed page only when htmlInline is set", async () => {
  const event = createR2Event(["k1"]);

  // 資料共有: HTML は inline + CSP sandbox でページ表示
  const inlineRes = await streamR2Object(event, "k1", {
    fileName: "sample.html",
    mimeType: "text/html",
    notFoundMessage: "not found",
    htmlInline: true,
  });
  assert.match(inlineRes.headers.get("Content-Disposition") ?? "", /^inline; /);
  assert.equal(inlineRes.headers.get("Content-Security-Policy"), "sandbox allow-scripts");

  // htmlInline 未指定(chat 添付相当): HTML は従来どおりダウンロード
  const attachmentRes = await streamR2Object(event, "k1", {
    fileName: "sample.html",
    mimeType: "text/html",
    notFoundMessage: "not found",
  });
  assert.match(attachmentRes.headers.get("Content-Disposition") ?? "", /^attachment; /);
  assert.equal(attachmentRes.headers.get("Content-Security-Policy"), null);

  // HTML 以外は htmlInline を指定しても CSP を付けない
  const pdfRes = await streamR2Object(event, "k1", {
    fileName: "deck.pdf",
    mimeType: "application/pdf",
    notFoundMessage: "not found",
    htmlInline: true,
  });
  assert.match(pdfRes.headers.get("Content-Disposition") ?? "", /^inline; /);
  assert.equal(pdfRes.headers.get("Content-Security-Policy"), null);
});

// miniflare のバインディングプロキシは Node の Headers を直列化できないため、
// writeHttpMetadata を呼ぶとローカル dev の配信が 500 になる(T-009)
test("streamR2Object resolves Content-Type without calling writeHttpMetadata", async () => {
  const event = createR2Event(["k1"], {
    httpMetadata: { contentType: "application/pdf" },
    writeHttpMetadata() {
      throw new Error("writeHttpMetadata must not be called");
    },
  });

  const res = await streamR2Object(event, "k1", {
    fileName: "deck.pdf",
    mimeType: null,
    notFoundMessage: "not found",
  });
  assert.equal(res.headers.get("Content-Type"), "application/pdf");

  // chat 添付は従来どおり R2 メタデータを参照しない
  const chatRes = await streamR2Object(event, "k1", {
    fileName: "deck.pdf",
    mimeType: null,
    notFoundMessage: "not found",
    useObjectMetadata: false,
  });
  assert.equal(chatRes.headers.get("Content-Type"), "application/octet-stream");
});

// miniflare のプロキシは標準 TypedArray しか復元できず、Buffer のまま put すると
// ローカル dev のアップロードが 500 になる(T-009)
test("toR2ObjectBody converts multipart Buffers into a plain Uint8Array", () => {
  const buffer = Buffer.from("資料本文", "utf8");
  const body = toR2ObjectBody(buffer);

  assert.equal(body.constructor, Uint8Array);
  assert.deepEqual([...body], [...buffer]);
});

test("every R2 upload passes its file data through toR2ObjectBody", async () => {
  const paths = [
    "../server/api/resources.post.ts",
    "../server/api/resources/[id].put.ts",
    "../server/api/chat/[scheduleId]/messages.post.ts",
  ];

  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.equal(
      (source.match(/toR2ObjectBody\(/g) ?? []).length,
      (source.match(/\.put\(/g) ?? []).length,
      `${path} の put 呼び出しが toR2ObjectBody を経由していない`,
    );
  }
});

test("resource URL validation only accepts http and https", () => {
  assert.equal(validateResourceUrl("https://example.com/path"), "https://example.com/path");
  assert.throws(() => validateResourceUrl("javascript:alert(1)"));
});

test("resources page and shared form expose user submission controls", async () => {
  const page = await readFile(new URL("../app/pages/resources/index.vue", import.meta.url), "utf8");
  const markdownPage = await readFile(new URL("../app/pages/resources/[id].vue", import.meta.url), "utf8");
  const markdownApi = await readFile(new URL("../server/api/resources/[id]/markdown.get.ts", import.meta.url), "utf8");
  const form = await readFile(new URL("../app/components/resource/ResourceSubmissionForm.vue", import.meta.url), "utf8");

  assert.match(page, /資料を投稿/);
  assert.match(page, /<Teleport to="body">/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /@click\.self="requestCloseForm"/);
  assert.match(page, /@dirty-change="isFormDirty = \$event"/);
  assert.match(page, /入力中の内容は保存されていません/);
  assert.match(page, /ResourceSubmissionForm/);
  assert.match(page, /canEdit/);
  assert.match(markdownPage, /ResourceMarkdownResponse/);
  assert.match(markdownPage, /v-html="contentHtml"/);
  assert.match(markdownPage, /ファイルを保存/);
  assert.match(markdownPage, /:download="resource\.fileName \|\| true"/);
  assert.doesNotMatch(page, /target="_blank"/);
  assert.match(page, /:target="resourceOpensInNewTab\(resource\) \? '_blank' : undefined"/);
  assert.match(page, /:rel="resourceOpensInNewTab\(resource\) \? 'noopener' : undefined"/);
  assert.match(markdownApi, /renderMarkdown/);
  assert.match(markdownApi, /isMarkdownFileName/);
  assert.match(markdownApi, /resolveMarkdownImageSources/);
  assert.match(form, /resource-images/);
  assert.match(form, /showImageField/);
  assert.match(form, /sourceMode/);
  assert.match(form, /dirty-change/);
  assert.match(form, /isDirty/);
  assert.match(form, /資料の投稿方法/);
  assert.match(form, /type="file"/);
  assert.match(form, /accept="[^"]*\.zip[^"]*"/);
  assert.match(form, /accept="[^"]*\.html[^"]*"/);
  assert.doesNotMatch(form, /canSubmitZip/);
  assert.doesNotMatch(form, /zipは管理者のみ投稿できます/);
  assert.doesNotMatch(form, /onUrlInput/);
  assert.doesNotMatch(form, /form\.url = ""/);
});

test("markdown image references resolve to the image delivery API", async () => {
  assert.equal(isResourceImageFileName("shot.png"), true);
  assert.equal(isResourceImageFileName("shot.webp"), true);
  assert.equal(isResourceImageFileName("notes.md"), false);

  const images = [
    { id: 5, file_name: "codex-01.png" },
    { id: 6, file_name: "図1.png" },
  ];
  const html = await renderMarkdown(
    [
      "![設定画面](screenshots/codex-01.png)",
      "![外部](https://example.com/pic.png)",
      "![日本語名](図1.png)",
      "![未添付](missing.png)",
    ].join("\n\n"),
  );
  const resolved = resolveMarkdownImageSources(html, 10, images);

  assert.match(resolved, /src="\/api\/resources\/10\/images\/5"/);
  assert.match(resolved, /src="\/api\/resources\/10\/images\/6"/);
  assert.match(resolved, /src="https:\/\/example\.com\/pic\.png"/);
  assert.match(resolved, /src="missing\.png"/);
  assert.doesNotMatch(resolved, /src="screenshots\/codex-01\.png"/);

  assert.equal(resolveMarkdownImageSources(html, 10, []), html);
});

test("markdown renderer converts Japanese markdown and sanitizes raw HTML", async () => {
  const html = await renderMarkdown("# 見出し\n\n<script>alert(1)</script>\n\n本文");

  assert.match(html, /<h1>見出し<\/h1>/);
  assert.match(html, /本文/);
  assert.doesNotMatch(html, /<script>/);
});
