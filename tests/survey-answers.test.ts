import assert from "node:assert/strict";
import test from "node:test";
import type { Survey } from "../types/portal.ts";
import { useSurveyAnswers } from "../app/composables/useSurveyAnswers.ts";
import { SURVEY_OTHER_OPTION_VALUE, serializeSurveyAnswer } from "../shared/utils/survey.ts";

function makeSurvey(): Survey {
  return {
    id: 1,
    title: "t",
    description: "",
    createdAt: "2026-08-19",
    status: "active",
    questions: [
      { id: 10, questionText: "単一", questionType: "single_choice", options: ["a", "b"], allowOtherText: true },
      { id: 20, questionText: "複数", questionType: "multiple_choice", options: ["x", "y"], allowOtherText: true },
      { id: 30, questionText: "自由", questionType: "free_text", options: [], allowOtherText: false },
    ],
  };
}

test("validateAnswers は未回答とその他未入力を検出し、修正で解消する", () => {
  const api = useSurveyAnswers(makeSurvey());
  assert.equal(api.validateAnswers(), false);
  assert.equal(api.validationErrors.value[10], "1つ選択してください");
  assert.equal(api.validationErrors.value[20], "1つ以上選択してください");
  assert.equal(api.validationErrors.value[30], undefined);

  const survey = makeSurvey();
  api.setSingleAnswer(10, SURVEY_OTHER_OPTION_VALUE);
  api.toggleMultipleAnswer(20, "x");
  assert.equal(api.validateAnswers(), false);
  assert.equal(api.validationErrors.value[10], "その他の内容を入力してください");

  api.setOtherText(survey.questions[0]!, "自由記入");
  assert.equal(api.validateAnswers(), true);
  assert.deepEqual(api.validationErrors.value, {});
});

test("回答値の取得・更新が 3 形態(string / string[] / selected+otherText)を正規化する", () => {
  const survey = makeSurvey();
  const api = useSurveyAnswers(survey);

  api.setSingleAnswer(10, "a");
  assert.equal(api.getSingleAnswer(10), "a");
  assert.equal(api.isOtherSelected(survey.questions[0]!), false);

  api.toggleMultipleAnswer(20, "x");
  api.toggleMultipleAnswer(20, SURVEY_OTHER_OPTION_VALUE);
  api.setOtherText(survey.questions[1]!, "その他回答");
  assert.deepEqual(api.getMultipleAnswers(20), ["x", SURVEY_OTHER_OPTION_VALUE]);
  assert.equal(api.getOtherText(20), "その他回答");
  assert.equal(api.isOtherSelected(survey.questions[1]!), true);

  api.toggleMultipleAnswer(20, "x");
  assert.deepEqual(api.getMultipleAnswers(20), [SURVEY_OTHER_OPTION_VALUE]);

  api.setSingleAnswer(30, "自由記述の内容");
  assert.equal(api.getTextAnswer(30), "自由記述の内容");
});

test("初期回答(シリアライズ済み)から復元し、再シリアライズで往復できる", () => {
  const survey = makeSurvey();
  const first = useSurveyAnswers(survey);
  first.setSingleAnswer(10, "b");
  first.toggleMultipleAnswer(20, "y");
  first.setSingleAnswer(30, "テキスト");

  const serialized = Object.fromEntries(
    survey.questions.map((q) => [q.id, serializeSurveyAnswer(first.answers.value[q.id])]),
  ) as Record<number, string>;

  const restored = useSurveyAnswers(survey, serialized);
  assert.equal(restored.getSingleAnswer(10), "b");
  assert.deepEqual(restored.getMultipleAnswers(20), ["y"]);
  assert.equal(restored.getTextAnswer(30), "テキスト");
});
