import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 回答ページと結果ページは同じ asyncData キーを共有し、取得済みキーは遷移時に再取得されない。
// 送信後にキャッシュを破棄しないと結果ページに送信前のデータが表示される。
test("survey form clears the shared survey detail cache after submitting", async () => {
  const [form, composable] = await Promise.all([
    readFile(new URL("../app/components/survey/SurveyForm.vue", import.meta.url), "utf8"),
    readFile(new URL("../app/composables/useSurveyDetail.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composable, /key: surveyDetailKey\(surveyId\)/);
  assert.match(form, /clearNuxtData\(surveyDetailKey\(props\.survey\.id\)\)/);
});
