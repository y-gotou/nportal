import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test('home hero does not show the "議事録を見る" action', async () => {
  const page = await readFile(new URL("../app/pages/index.vue", import.meta.url), "utf8");
  const heroActions = page.match(/<template #actions>([\s\S]*?)<\/template>/);

  assert.ok(heroActions, "expected home page hero actions template to exist");
  assert.doesNotMatch(heroActions[1], /議事録を見る/);
});
