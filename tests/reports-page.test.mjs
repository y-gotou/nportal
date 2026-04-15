import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("reports page includes dropdown type selector, back link, and completion message", async () => {
  const page = await readFile(new URL("../app/pages/reports.vue", import.meta.url), "utf8");

  assert.match(page, /不具合・要望報告/);
  assert.match(page, /<select/);
  assert.match(page, /id="report-type"/);
  assert.match(page, /不具合/);
  assert.match(page, /要望/);
  assert.match(page, /件名/);
  assert.match(page, /詳細/);
  assert.match(page, /ご報告ありがとうございます。/);
  assert.match(page, /IconArrowLeft/);
  assert.doesNotMatch(page, /利用中に気づいた不具合や改善要望を送信できます/);
});

test("site header exposes reports entry from authenticated user menus", async () => {
  const header = await readFile(new URL("../app/components/SiteHeader.vue", import.meta.url), "utf8");

  assert.match(header, /to="\/reports"/);
  assert.match(header, /不具合・要望報告/);
});
