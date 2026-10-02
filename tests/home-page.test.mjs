import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home page prioritizes action sections over legacy service cards", async () => {
  const page = await readFile(new URL("../app/pages/index.vue", import.meta.url), "utf8");

  assert.match(page, /title="受付中のアンケート"/);
  assert.match(page, /title="最近の資料"/);
  assert.match(page, /<PageHero\s+v-if="nextEvent"/);
  assert.doesNotMatch(page, /service cards/i);
});

// 直書きの配色にはダークモード用の指定が無く、ダークモードで白いバッジになっていた
test("home page takes the survey badge colors from the shared status helper", async () => {
  const page = await readFile(new URL("../app/pages/index.vue", import.meta.url), "utf8");

  assert.match(page, /:class="surveyStatusClass\(survey\.status\)"/);
  assert.doesNotMatch(page, /bg-blue-50/);
});
