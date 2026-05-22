import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("survey results component preserves line breaks for free-text answers", async () => {
  const component = await readFile(
    new URL("../app/components/SurveyResults.vue", import.meta.url),
    "utf8",
  );

  const matches = component.match(/whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm leading-6/g) ?? [];

  assert.equal(matches.length, 2);
});
