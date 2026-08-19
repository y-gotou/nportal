import { ref } from "vue";
import type { Survey, SurveyAnswerValue, SurveyQuestion } from "../../types/portal.ts";
// #shared はテスト実行(node --experimental-strip-types)でも package.json の imports で解決される
import {
  SURVEY_OTHER_OPTION_VALUE,
  buildSurveyInitialAnswers,
} from "#shared/utils/survey";

// 回答フォーム(SurveyForm)の回答値モデル。
// SurveyAnswerValue は string | string[] | { selected, otherText } の 3 形態を取るため、
// 取得・更新・検証の正規化ロジックをここに集約する。
export function useSurveyAnswers(survey: Survey, initialAnswers?: Record<number, string>) {
  const answers = ref<Record<number, SurveyAnswerValue>>(
    buildSurveyInitialAnswers(survey, initialAnswers),
  );
  const validationErrors = ref<Record<number, string>>({});

  function clearValidationError(questionId: number) {
    if (validationErrors.value[questionId]) {
      const { [questionId]: _, ...rest } = validationErrors.value;
      validationErrors.value = rest;
    }
  }

  function getSingleAnswer(questionId: number) {
    const answer = answers.value[questionId];
    if (typeof answer === "string") {
      return answer;
    }
    if (Array.isArray(answer)) {
      return "";
    }
    return typeof answer?.selected === "string" ? answer.selected : "";
  }

  function getMultipleAnswers(questionId: number) {
    const answer = answers.value[questionId];
    if (Array.isArray(answer)) {
      return answer;
    }
    if (typeof answer === "object" && answer !== null && Array.isArray(answer.selected)) {
      return answer.selected;
    }
    return [];
  }

  function getOtherText(questionId: number) {
    const answer = answers.value[questionId];
    if (typeof answer === "object" && answer !== null && !Array.isArray(answer)) {
      return answer.otherText;
    }
    return "";
  }

  function getTextAnswer(questionId: number) {
    const answer = answers.value[questionId];
    return typeof answer === "string" ? answer : "";
  }

  function isOtherSelected(question: SurveyQuestion) {
    if (question.questionType === "single_choice") {
      return getSingleAnswer(question.id) === SURVEY_OTHER_OPTION_VALUE;
    }
    if (question.questionType === "multiple_choice") {
      return getMultipleAnswers(question.id).includes(SURVEY_OTHER_OPTION_VALUE);
    }
    return false;
  }

  function toggleMultipleAnswer(questionId: number, option: string) {
    const selected = getMultipleAnswers(questionId);
    const otherText = getOtherText(questionId);
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    answers.value = {
      ...answers.value,
      [questionId]: next.includes(SURVEY_OTHER_OPTION_VALUE)
        ? { selected: next, otherText }
        : next,
    };

    clearValidationError(questionId);
  }

  function setSingleAnswer(questionId: number, answer: string) {
    const otherText = getOtherText(questionId);
    answers.value = {
      ...answers.value,
      [questionId]: answer === SURVEY_OTHER_OPTION_VALUE
        ? { selected: answer, otherText }
        : answer,
    };

    clearValidationError(questionId);
  }

  function setOtherText(question: SurveyQuestion, otherText: string) {
    if (question.questionType === "single_choice") {
      answers.value = {
        ...answers.value,
        [question.id]: {
          selected: SURVEY_OTHER_OPTION_VALUE,
          otherText,
        },
      };
    } else if (question.questionType === "multiple_choice") {
      const selected = getMultipleAnswers(question.id);
      const nextSelected = selected.includes(SURVEY_OTHER_OPTION_VALUE)
        ? selected
        : [...selected, SURVEY_OTHER_OPTION_VALUE];
      answers.value = {
        ...answers.value,
        [question.id]: {
          selected: nextSelected,
          otherText,
        },
      };
    }

    clearValidationError(question.id);
  }

  function validateAnswers(): boolean {
    const errors: Record<number, string> = {};

    for (const question of survey.questions) {
      if (question.questionType === "single_choice") {
        const answer = getSingleAnswer(question.id);
        if (!answer) {
          errors[question.id] = "1つ選択してください";
        } else if (
          question.allowOtherText &&
          answer === SURVEY_OTHER_OPTION_VALUE &&
          !getOtherText(question.id).trim()
        ) {
          errors[question.id] = "その他の内容を入力してください";
        }
      } else if (question.questionType === "multiple_choice") {
        const selected = getMultipleAnswers(question.id);
        if (selected.length === 0) {
          errors[question.id] = "1つ以上選択してください";
        } else if (
          question.allowOtherText &&
          selected.includes(SURVEY_OTHER_OPTION_VALUE) &&
          !getOtherText(question.id).trim()
        ) {
          errors[question.id] = "その他の内容を入力してください";
        }
      }
    }

    validationErrors.value = errors;
    return Object.keys(errors).length === 0;
  }

  return {
    answers,
    validationErrors,
    clearValidationError,
    getSingleAnswer,
    getMultipleAnswers,
    getOtherText,
    getTextAnswer,
    isOtherSelected,
    toggleMultipleAnswer,
    setSingleAnswer,
    setOtherText,
    validateAnswers,
  };
}

export type SurveyAnswersApi = ReturnType<typeof useSurveyAnswers>;
