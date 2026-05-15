import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAX_RESOURCE_FILE_SIZE,
  buildResourceContentDisposition,
  getResourceFileUrl,
  inferResourceType,
  normalizeResourceMimeType,
  sanitizeFileName,
  validateResourceFile,
  validateResourceUrl,
} from "../server/utils/resources.ts";
import { renderMarkdown } from "../server/utils/minutes.ts";

test("resource file helpers validate allowed files and infer resource types", () => {
  assert.equal(inferResourceType({ url: "https://example.com/doc" }), "URL");
  assert.equal(inferResourceType({ fileName: "deck.pptx" }), "PowerPoint");
  assert.equal(inferResourceType({ fileName: "notes.md" }), "Markdown");
  assert.equal(inferResourceType({ fileName: "archive.zip" }), "ZIP");
  assert.equal(getResourceFileUrl(10, "notes.md"), "/resources/10");
  assert.equal(getResourceFileUrl(10, "deck.pdf"), "/api/resources/10/file");
  assert.equal(normalizeResourceMimeType("notes.md", "application/octet-stream"), "text/markdown; charset=utf-8");
  assert.equal(normalizeResourceMimeType("deck.pdf", "application/pdf"), "application/pdf");
  assert.equal(sanitizeFileName("../demo deck.pdf"), "demo deck.pdf");
  assert.equal(sanitizeFileName("../営業資料.pptx"), "営業資料.pptx");
  assert.equal(
    buildResourceContentDisposition("営業資料.pptx"),
    `inline; filename="____.pptx"; filename*=UTF-8''%E5%96%B6%E6%A5%AD%E8%B3%87%E6%96%99.pptx`,
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
      fileName: "archive.zip",
      size: 1024,
      mimeType: "application/zip",
    }, { allowZip: true }),
  );

  assert.throws(() =>
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

test("resource URL validation only accepts http and https", () => {
  assert.equal(validateResourceUrl("https://example.com/path"), "https://example.com/path");
  assert.throws(() => validateResourceUrl("javascript:alert(1)"));
});

test("resources page and shared form expose user submission controls", async () => {
  const page = await readFile(new URL("../app/pages/resources/index.vue", import.meta.url), "utf8");
  const markdownPage = await readFile(new URL("../app/pages/resources/[id].vue", import.meta.url), "utf8");
  const markdownApi = await readFile(new URL("../server/api/resources/[id]/markdown.get.ts", import.meta.url), "utf8");
  const form = await readFile(new URL("../app/components/ResourceSubmissionForm.vue", import.meta.url), "utf8");

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
  assert.match(markdownPage, /元ファイルを開く/);
  assert.match(markdownApi, /renderMarkdown/);
  assert.match(markdownApi, /isMarkdownFileName/);
  assert.match(form, /sourceMode/);
  assert.match(form, /dirty-change/);
  assert.match(form, /isDirty/);
  assert.match(form, /資料の投稿方法/);
  assert.match(form, /type="file"/);
  assert.match(form, /canSubmitZip/);
  assert.match(form, /:accept="fileAccept"/);
  assert.match(form, /zipは管理者のみ投稿できます/);
  assert.doesNotMatch(form, /onUrlInput/);
  assert.doesNotMatch(form, /form\.url = ""/);
});

test("markdown renderer converts Japanese markdown and sanitizes raw HTML", async () => {
  const html = await renderMarkdown("# 見出し\n\n<script>alert(1)</script>\n\n本文");

  assert.match(html, /<h1>見出し<\/h1>/);
  assert.match(html, /本文/);
  assert.doesNotMatch(html, /<script>/);
});
