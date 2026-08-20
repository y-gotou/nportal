import assert from "node:assert/strict";
import test from "node:test";
import { ref } from "vue";
import { useSurveyQuestionDraft } from "../app/composables/useSurveyQuestionDraft.ts";

test("validateQuestions は設問文・選択肢の不備を検出する", () => {
  const editor = useSurveyQuestionDraft();
  // 初期状態: 設問文が空、選択肢が空文字 1 件
  const errors = editor.validateQuestions();
  assert.equal(errors.q_0_text, "設問1の文章は必須です。");
  assert.equal(errors.q_0_options, "設問1の選択肢は1件以上必要です。");
});

test("validateQuestions は入力を修正すると以前のエラーを返さない(再検証で残らない)", () => {
  const editor = useSurveyQuestionDraft();
  assert.ok(Object.keys(editor.validateQuestions()).length > 0);

  const question = editor.questions.value[0]!;
  question.questionText = "満足度を教えてください";
  question.options = ["満足", "不満"];

  assert.deepEqual(editor.validateQuestions(), {});
});

test("validateQuestions は設問ゼロと空選択肢の混在を検出する", () => {
  const editor = useSurveyQuestionDraft();
  editor.removeQuestion(0);
  assert.equal(editor.validateQuestions().questions, "設問を1つ以上追加してください。");

  editor.addQuestion();
  const question = editor.questions.value[0]!;
  question.questionText = "q";
  question.options = ["a", " "];
  assert.equal(editor.validateQuestions().q_0_options, "設問1に空の選択肢があります。");
});

test("locked 中は編集操作と検証を行わない", () => {
  const locked = ref(true);
  const editor = useSurveyQuestionDraft({
    initial: [
      { id: 1, questionText: "q1", questionType: "single_choice", options: ["a"], allowOtherText: false },
    ],
    locked,
  });

  editor.addQuestion();
  editor.removeQuestion(0);
  assert.equal(editor.questions.value.length, 1);
  assert.deepEqual(editor.validateQuestions(), {});

  locked.value = false;
  editor.addQuestion();
  assert.equal(editor.questions.value.length, 2);
});

test("toRequestBody は trim と free_text の選択肢クリアを行う", () => {
  const editor = useSurveyQuestionDraft({
    initial: [
      { id: 1, questionText: "  選択  ", questionType: "single_choice", options: [" a ", "b"], allowOtherText: true },
      { id: 2, questionText: "自由", questionType: "free_text", options: [], allowOtherText: true },
    ],
  });

  assert.deepEqual(editor.toRequestBody(), [
    { questionText: "選択", questionType: "single_choice", options: ["a", "b"], allowOtherText: true },
    { questionText: "自由", questionType: "free_text", options: [], allowOtherText: false },
  ]);
});

test("moveUp / moveDown / moveOptionUp / moveOptionDown は境界で何もしない", () => {
  const editor = useSurveyQuestionDraft({
    initial: [
      { id: 1, questionText: "q1", questionType: "single_choice", options: ["a", "b"], allowOtherText: false },
      { id: 2, questionText: "q2", questionType: "single_choice", options: ["c"], allowOtherText: false },
    ],
  });

  editor.moveUp(0);
  editor.moveDown(1);
  assert.deepEqual(editor.questions.value.map((q) => q.questionText), ["q1", "q2"]);

  editor.moveDown(0);
  assert.deepEqual(editor.questions.value.map((q) => q.questionText), ["q2", "q1"]);

  const question = editor.questions.value[1]!;
  editor.moveOptionDown(question, 0);
  assert.deepEqual(question.options, ["b", "a"]);
  editor.moveOptionUp(question, 0);
  assert.deepEqual(question.options, ["b", "a"]);
});
