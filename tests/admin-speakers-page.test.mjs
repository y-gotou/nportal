import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

// 列が多く、1280px 幅でも「削除」「時間」「20分」が 1 文字ずつ縦に折り返していた
test("admin speakers table scrolls inside its frame and keeps short cells on one line", async () => {
  const page = await readSource("../app/pages/admin/speakers.vue");

  assert.match(page, /class="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm"/);

  const headers = [...page.matchAll(/<th class="([^"]*)">[^<]+<\/th>/g)];
  assert.equal(headers.length, 6);
  for (const [, className] of headers) assert.match(className, /\bwhitespace-nowrap\b/);

  assert.match(page, /<td class="[^"]*\bwhitespace-nowrap\b[^"]*">\s*\{\{ app\.duration \}\}分/);
});

test("admin delete button label stays on one line", async () => {
  const button = await readSource("../app/components/admin/AdminDeleteButton.vue");

  assert.match(button, /<button\s+type="button"\s+class="[^"]*\bwhitespace-nowrap\b/);
});
