import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("survey results component preserves line breaks for free-text answers", async () => {
  const component = await readFile(
    new URL("../app/components/survey/SurveyResults.vue", import.meta.url),
    "utf8",
  );

  const matches = component.match(/<div class="whitespace-pre-wrap px-4 py-3">/g) ?? [];

  assert.equal(matches.length, 2);
});
