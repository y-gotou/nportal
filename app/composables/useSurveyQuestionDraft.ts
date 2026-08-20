import { ref, toValue, type MaybeRefOrGetter } from "vue";
// テスト(node --experimental-strip-types)から直接 import するため相対パス + .ts 拡張子で参照する
import type { SurveyQuestion, SurveyQuestionType } from "../../types/portal.ts";

export interface SurveyQuestionDraft {
  questionText: string;
  questionType: SurveyQuestionType;
  options: string[];
  allowOtherText: boolean;
}

function emptyQuestion(): SurveyQuestionDraft {
  return { questionText: "", questionType: "single_choice", options: [""], allowOtherText: false };
}

function normalizeOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

// admin/surveys の new / edit で共用する設問編集ロジック。
// locked が true の間は設問の追加・削除・並べ替え・検証を行わない(回答済みアンケートの編集ロック)。
export function useSurveyQuestionDraft(options: {
  initial?: SurveyQuestion[];
  locked?: MaybeRefOrGetter<boolean>;
} = {}) {
  const isLocked = () => toValue(options.locked ?? false);

  const questions = ref<SurveyQuestionDraft[]>(
    options.initial
      ? options.initial.map((q) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.questionType === "free_text" ? [] : (q.options.length ? [...q.options] : [""]),
          allowOtherText: q.allowOtherText,
        }))
      : [emptyQuestion()],
  );

  function addQuestion() {
    if (isLocked()) return;
    questions.value.push(emptyQuestion());
  }

  function removeQuestion(index: number) {
    if (isLocked()) return;
    questions.value.splice(index, 1);
  }

  function moveUp(index: number) {
    if (isLocked()) return;
    if (index === 0) return;
    const arr = questions.value;
    const prev = arr[index - 1]!;
    const curr = arr[index]!;
    arr.splice(index - 1, 2, curr, prev);
  }

  function moveDown(index: number) {
    if (isLocked()) return;
    const arr = questions.value;
    if (index === arr.length - 1) return;
    const curr = arr[index]!;
    const next = arr[index + 1]!;
    arr.splice(index, 2, next, curr);
  }

  function addOption(question: SurveyQuestionDraft) {
    if (isLocked()) return;
    question.options.push("");
  }

  function removeOption(question: SurveyQuestionDraft, optionIndex: number) {
    if (isLocked()) return;
    question.options.splice(optionIndex, 1);
  }

  function moveOptionUp(question: SurveyQuestionDraft, optionIndex: number) {
    if (isLocked()) return;
    if (optionIndex === 0) return;
    const opts = question.options;
    const previous = opts[optionIndex - 1]!;
    const current = opts[optionIndex]!;
    opts.splice(optionIndex - 1, 2, current, previous);
  }

  function moveOptionDown(question: SurveyQuestionDraft, optionIndex: number) {
    if (isLocked()) return;
    if (optionIndex === question.options.length - 1) return;
    const opts = question.options;
    const current = opts[optionIndex]!;
    const next = opts[optionIndex + 1]!;
    opts.splice(optionIndex, 2, next, current);
  }

  function handleQuestionTypeChange(question: SurveyQuestionDraft) {
    if (isLocked()) return;
    if (question.questionType === "free_text") {
      question.allowOtherText = false;
      return;
    }

    if (question.options.length === 0) {
      question.options.push("");
    }
  }

  // 設問に関する検証エラーを返す(ロック中は設問を送信しないため検証しない)
  function validateQuestions(): Record<string, string> {
    if (isLocked()) return {};

    const e: Record<string, string> = {};
    if (questions.value.length === 0) e.questions = "設問を1つ以上追加してください。";
    questions.value.forEach((q, i) => {
      if (!q.questionText.trim()) e[`q_${i}_text`] = `設問${i + 1}の文章は必須です。`;
      if (q.questionType !== "free_text") {
        const normalizedOptions = normalizeOptions(q.options);
        if (normalizedOptions.length === 0) {
          e[`q_${i}_options`] = `設問${i + 1}の選択肢は1件以上必要です。`;
        } else if (normalizedOptions.length !== q.options.length) {
          e[`q_${i}_options`] = `設問${i + 1}に空の選択肢があります。`;
        }
      }
    });
    return e;
  }

  // API へ送る設問配列を組み立てる
  function toRequestBody() {
    return questions.value.map((q) => ({
      questionText: q.questionText.trim(),
      questionType: q.questionType,
      options: q.questionType !== "free_text" ? normalizeOptions(q.options) : [],
      allowOtherText: q.questionType !== "free_text" && q.allowOtherText,
    }));
  }

  return {
    questions,
    addQuestion,
    removeQuestion,
    moveUp,
    moveDown,
    addOption,
    removeOption,
    moveOptionUp,
    moveOptionDown,
    handleQuestionTypeChange,
    validateQuestions,
    toRequestBody,
  };
}

export type SurveyQuestionDraftEditor = ReturnType<typeof useSurveyQuestionDraft>;
