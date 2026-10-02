import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readComponent = (name) =>
  readFile(new URL(`../app/components/survey/${name}`, import.meta.url), "utf8");

test("survey results render free-text answers through the shared answer component", async () => {
  const results = await readComponent("SurveyResults.vue");

  assert.equal((results.match(/<SurveyTextAnswer\b/g) ?? []).length, 2);
});

test("survey text answer preserves line breaks", async () => {
  const answer = await readComponent("SurveyTextAnswer.vue");

  assert.match(answer, /<p class="whitespace-pre-wrap break-words">\{\{ answer\.text \}\}<\/p>/);
});

test("survey text answer shows the comment button only when commenting is allowed", async () => {
  const answer = await readComponent("SurveyTextAnswer.vue");
  const results = await readFile(
    new URL("../app/pages/survey/[id]/results.vue", import.meta.url),
    "utf8",
  );

  assert.match(answer, /<button\s+v-if="canComment"/);
  assert.match(results, /isAdmin === true && survey\.status === "closed"/);
});
