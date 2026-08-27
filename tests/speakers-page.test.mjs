import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("speakers page renders the minutes link as a shared secondary button", async () => {
  const page = await readFile(new URL("../app/pages/speakers.vue", import.meta.url), "utf8");

  assert.match(
    page,
    /<NuxtLink\s+v-if="app\.minutes_slug"\s+:to="`\/minutes\/\$\{app\.minutes_slug\}`"\s+:class="secondaryButtonClass"/,
  );
  assert.doesNotMatch(page, /text-blue-600 hover:underline/);
});

test("speakers page wraps the note text", async () => {
  const page = await readFile(new URL("../app/pages/speakers.vue", import.meta.url), "utf8");

  assert.match(page, /v-if="app\.note"[^>]*whitespace-pre-wrap break-words/);
});
