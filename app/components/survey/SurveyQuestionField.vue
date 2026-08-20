<script setup lang="ts">
import type { SurveyQuestion } from "~~/types/portal";
import { surfaceCardClass } from "~/utils/ui";
import {
  SURVEY_OTHER_OPTION_LABEL,
  SURVEY_OTHER_OPTION_VALUE,
} from "#shared/utils/survey";
import type { SurveyAnswersApi } from "~/composables/useSurveyAnswers";

// アンケート回答フォームの 1 設問分の描画。回答状態は useSurveyAnswers(api)が持つ。
const props = defineProps<{
  question: SurveyQuestion;
  index: number;
  api: SurveyAnswersApi;
}>();

const isSingle = computed(() => props.question.questionType === "single_choice");

const optionInputClass = computed(() =>
  isSingle.value
    ? "mt-0.5 h-4 w-4 border-border text-blue-500 focus:ring-blue-500"
    : "mt-0.5 h-4 w-4 rounded border-border text-blue-500 focus:ring-blue-500",
);

function isChecked(option: string) {
  return isSingle.value
    ? props.api.getSingleAnswer(props.question.id) === option
    : props.api.getMultipleAnswers(props.question.id).includes(option);
}

function onSelect(option: string) {
  if (isSingle.value) {
    props.api.setSingleAnswer(props.question.id, option);
  } else {
    props.api.toggleMultipleAnswer(props.question.id, option);
  }
}
</script>

<template>
  <section
    :class="`${surfaceCardClass} space-y-4`"
    :aria-describedby="api.validationErrors.value[question.id] ? `error-${question.id}` : undefined"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold tracking-[0.16em] text-muted">
        Q{{ index + 1 }}
      </p>
      <h3 class="text-lg font-semibold tracking-tight text-foreground">
        {{ question.questionText }}
        <span
          v-if="question.questionType !== 'free_text'"
          class="ml-1 text-sm font-normal text-rose-500"
          aria-hidden="true"
        >*</span>
      </h3>
    </div>

    <div v-if="question.questionType !== 'free_text'" class="space-y-3">
      <label
        v-for="option in question.options"
        :key="option"
        class="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/10"
        :class="{ 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20': api.validationErrors.value[question.id] }"
      >
        <input
          :name="`question-${question.id}`"
          :type="isSingle ? 'radio' : 'checkbox'"
          :value="option"
          :checked="isChecked(option)"
          :class="optionInputClass"
          @change="onSelect(option)"
        >
        <span>{{ option }}</span>
      </label>

      <label
        v-if="question.allowOtherText"
        class="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/10"
        :class="{ 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20': api.validationErrors.value[question.id] }"
      >
        <input
          :name="`question-${question.id}`"
          :type="isSingle ? 'radio' : 'checkbox'"
          :value="SURVEY_OTHER_OPTION_VALUE"
          :checked="isChecked(SURVEY_OTHER_OPTION_VALUE)"
          :class="optionInputClass"
          @change="onSelect(SURVEY_OTHER_OPTION_VALUE)"
        >
        <span class="w-full space-y-3">
          <span class="block">{{ SURVEY_OTHER_OPTION_LABEL }}</span>
          <input
            v-if="api.isOtherSelected(question)"
            :value="api.getOtherText(question.id)"
            type="text"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="内容を入力してください"
            @input="api.setOtherText(question, ($event.target as HTMLInputElement).value)"
          >
        </span>
      </label>
    </div>

    <textarea
      v-else
      :id="`question-${question.id}`"
      :value="api.getTextAnswer(question.id)"
      :name="`question-${question.id}`"
      :aria-label="question.questionText"
      autocomplete="off"
      class="min-h-32 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      rows="5"
      placeholder="自由にご記入ください…"
      @input="api.setSingleAnswer(question.id, ($event.target as HTMLTextAreaElement).value)"
    />

    <p
      v-if="api.validationErrors.value[question.id]"
      :id="`error-${question.id}`"
      :data-question-id="question.id"
      tabindex="-1"
      class="flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400 focus-visible:outline-none"
      role="alert"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {{ api.validationErrors.value[question.id] }}
    </p>
  </section>
</template>
