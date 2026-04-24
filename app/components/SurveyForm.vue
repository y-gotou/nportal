<script setup lang="ts">
import type { Survey, SurveyAnswerValue, SurveyQuestion } from "~~/types/portal";
import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceCardClass,
} from "~/utils/ui";
import {
  parseSurveySelectionAnswer,
  serializeSurveyAnswer,
  SURVEY_OTHER_OPTION_LABEL,
  SURVEY_OTHER_OPTION_VALUE,
} from "~~/utils/survey";

const props = defineProps<{
  survey: Survey;
  initialAnswers?: Record<number, string>;
  isEditing?: boolean;
}>();

function buildInitialAnswers(
  survey: Survey,
  initial: Record<number, string> | undefined,
): Record<number, SurveyAnswerValue> {
  if (!initial) return {};

  const result: Record<number, SurveyAnswerValue> = {};

  for (const question of survey.questions) {
    const raw = initial[question.id];
    if (typeof raw !== "string") continue;

    if (question.questionType === "free_text") {
      result[question.id] = raw;
      continue;
    }

    const parsed = parseSurveySelectionAnswer(raw, question.questionType);
    const hasOther = parsed.selected.includes(SURVEY_OTHER_OPTION_VALUE);

    if (question.questionType === "single_choice") {
      const selected = parsed.selected[0] ?? "";
      if (selected === SURVEY_OTHER_OPTION_VALUE) {
        result[question.id] = {
          selected: SURVEY_OTHER_OPTION_VALUE,
          otherText: parsed.otherText,
        };
      } else {
        result[question.id] = selected;
      }
      continue;
    }

    if (hasOther) {
      result[question.id] = {
        selected: parsed.selected,
        otherText: parsed.otherText,
      };
    } else {
      result[question.id] = [...parsed.selected];
    }
  }

  return result;
}

const answers = ref<Record<number, SurveyAnswerValue>>(
  buildInitialAnswers(props.survey, props.initialAnswers),
);
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref("");
const validationErrors = ref<Record<number, string>>({});
const successRef = ref<HTMLElement | null>(null);
const errorRef = ref<HTMLElement | null>(null);

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

function getTextAnswer(questionId: number) {
  const answer = answers.value[questionId];
  return typeof answer === "string" ? answer : "";
}

function validateAnswers(): boolean {
  const errors: Record<number, string> = {};

  for (const question of props.survey.questions) {
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
    // text は任意入力
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function submitSurvey() {
  if (!validateAnswers()) {
    // 最初のバリデーションエラーの設問にフォーカスを移動
    await nextTick();
    const firstErrorId = Object.keys(validationErrors.value)[0];
    if (firstErrorId) {
      const el = document.querySelector<HTMLElement>(
        `[data-question-id="${firstErrorId}"]`,
      );
      el?.focus();
    }
    return;
  }

  errorMessage.value = "";
  isSubmitting.value = true;

  try {
    await $fetch("/api/survey", {
      method: "POST",
      body: {
        surveyId: props.survey.id,
        responses: props.survey.questions.map((question) => ({
          questionId: question.id,
          answer: serializeSurveyAnswer(answers.value[question.id]),
        })),
      },
    });

    isSubmitted.value = true;
    await nextTick();
    successRef.value?.focus();
  } catch {
    errorMessage.value = "送信に失敗しました。時間をおいて再度お試しください。";
    await nextTick();
    errorRef.value?.focus();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <!-- スクリーンリーダー向け aria-live リージョン（常にDOMに存在） -->
  <div aria-live="polite" aria-atomic="true" class="sr-only">
    <span v-if="isSubmitted">
      {{ isEditing ? "回答を更新しました。" : "回答ありがとうございました。" }}回答は保存されました。
    </span>
    <span v-else-if="errorMessage">{{ errorMessage }}</span>
  </div>

  <div
    v-if="isSubmitted"
    ref="successRef"
    tabindex="-1"
    class="space-y-4 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
  >
    <h2 class="text-xl font-semibold tracking-tight text-slate-900">
      {{ isEditing ? "回答を更新しました" : "回答ありがとうございました" }}
    </h2>
    <p class="text-sm leading-6 text-slate-600">
      回答は保存されました。結果ページから集計を確認できます。
    </p>
    <div class="flex flex-wrap gap-3">
      <NuxtLink
        :to="`/survey/${survey.id}/results`"
        :class="primaryButtonClass"
      >
        結果を見る
      </NuxtLink>
      <NuxtLink
        to="/survey"
        :class="secondaryButtonClass"
      >
        <IconArrowLeft />
        一覧へ戻る
      </NuxtLink>
    </div>
  </div>

  <form v-else class="space-y-6" @submit.prevent="submitSurvey">
    <section
      v-for="(question, index) in survey.questions"
      :key="question.id"
      :class="`${surfaceCardClass} space-y-4`"
      :aria-describedby="validationErrors[question.id] ? `error-${question.id}` : undefined"
    >
      <div class="space-y-1">
        <p class="text-xs font-semibold tracking-[0.16em] text-slate-500">
          Q{{ index + 1 }}
        </p>
        <h3 class="text-lg font-semibold tracking-tight text-slate-900">
          {{ question.questionText }}
          <span
            v-if="question.questionType !== 'free_text'"
            class="ml-1 text-sm font-normal text-rose-500"
            aria-hidden="true"
          >*</span>
        </h3>
      </div>

      <div v-if="question.questionType === 'single_choice'" class="space-y-3">
        <label
          v-for="option in question.options"
          :key="option"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
          :class="{ 'border-rose-200 bg-rose-50': validationErrors[question.id] }"
        >
          <input
            :name="`question-${question.id}`"
            type="radio"
            :value="option"
            :checked="getSingleAnswer(question.id) === option"
            class="mt-0.5 h-4 w-4 border-slate-300 text-blue-500 focus:ring-blue-500"
            @change="setSingleAnswer(question.id, option)"
          >
          <span>{{ option }}</span>
        </label>

        <label
          v-if="question.allowOtherText"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
          :class="{ 'border-rose-200 bg-rose-50': validationErrors[question.id] }"
        >
          <input
            :name="`question-${question.id}`"
            type="radio"
            :value="SURVEY_OTHER_OPTION_VALUE"
            :checked="getSingleAnswer(question.id) === SURVEY_OTHER_OPTION_VALUE"
            class="mt-0.5 h-4 w-4 border-slate-300 text-blue-500 focus:ring-blue-500"
            @change="setSingleAnswer(question.id, SURVEY_OTHER_OPTION_VALUE)"
          >
          <span class="w-full space-y-3">
            <span class="block">{{ SURVEY_OTHER_OPTION_LABEL }}</span>
            <input
              v-if="isOtherSelected(question)"
              :value="getOtherText(question.id)"
              type="text"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="内容を入力してください"
              @input="setOtherText(question, ($event.target as HTMLInputElement).value)"
            >
          </span>
        </label>
      </div>

      <div v-else-if="question.questionType === 'multiple_choice'" class="space-y-3">
        <label
          v-for="option in question.options"
          :key="option"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
          :class="{ 'border-rose-200 bg-rose-50': validationErrors[question.id] }"
        >
          <input
            :name="`question-${question.id}`"
            type="checkbox"
            :checked="getMultipleAnswers(question.id).includes(option)"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
            @change="toggleMultipleAnswer(question.id, option)"
          >
          <span>{{ option }}</span>
        </label>

        <label
          v-if="question.allowOtherText"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
          :class="{ 'border-rose-200 bg-rose-50': validationErrors[question.id] }"
        >
          <input
            :name="`question-${question.id}`"
            type="checkbox"
            :checked="getMultipleAnswers(question.id).includes(SURVEY_OTHER_OPTION_VALUE)"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
            @change="toggleMultipleAnswer(question.id, SURVEY_OTHER_OPTION_VALUE)"
          >
          <span class="w-full space-y-3">
            <span class="block">{{ SURVEY_OTHER_OPTION_LABEL }}</span>
            <input
              v-if="isOtherSelected(question)"
              :value="getOtherText(question.id)"
              type="text"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="内容を入力してください"
              @input="setOtherText(question, ($event.target as HTMLInputElement).value)"
            >
          </span>
        </label>
      </div>

      <textarea
        v-else
        :id="`question-${question.id}`"
        :value="getTextAnswer(question.id)"
        :name="`question-${question.id}`"
        :aria-label="question.questionText"
        autocomplete="off"
        class="min-h-32 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        rows="5"
        placeholder="自由にご記入ください…"
        @input="setSingleAnswer(question.id, ($event.target as HTMLTextAreaElement).value)"
      />

      <!-- バリデーションエラーメッセージ -->
      <p
        v-if="validationErrors[question.id]"
        :id="`error-${question.id}`"
        :data-question-id="question.id"
        tabindex="-1"
        class="flex items-center gap-1.5 text-sm text-rose-600 focus-visible:outline-none"
        role="alert"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        {{ validationErrors[question.id] }}
      </p>
    </section>

    <!-- 送信エラーメッセージ -->
    <div
      v-if="errorMessage"
      ref="errorRef"
      tabindex="-1"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <p class="text-xs text-slate-500">
      <span class="text-rose-500" aria-hidden="true">*</span> は必須項目です
    </p>

    <button
      :class="`${primaryButtonClass} w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-blue-300`"
      type="submit"
      :disabled="isSubmitting"
    >
      {{ isSubmitting ? "送信中…" : isEditing ? "回答を更新" : "回答を送信" }}
    </button>
  </form>
</template>
