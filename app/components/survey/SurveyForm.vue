<script setup lang="ts">
import type { Survey } from "~~/types/portal";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "~/utils/ui";
import { serializeSurveyAnswer } from "#shared/utils/survey";

const props = defineProps<{
  survey: Survey;
  initialAnswers?: Record<number, string>;
  isEditing?: boolean;
}>();

const api = useSurveyAnswers(props.survey, props.initialAnswers);
const { answers, validationErrors } = api;

const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref("");
const successRef = ref<HTMLElement | null>(null);
const errorRef = ref<HTMLElement | null>(null);

async function submitSurvey() {
  if (!api.validateAnswers()) {
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
    class="space-y-4 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-green-800 dark:bg-green-900/20"
  >
    <h2 class="text-xl font-semibold tracking-tight text-foreground">
      {{ isEditing ? "回答を更新しました" : "回答ありがとうございました" }}
    </h2>
    <p class="text-sm leading-6 text-muted">
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
    <SurveyQuestionField
      v-for="(question, index) in survey.questions"
      :key="question.id"
      :question="question"
      :index="index"
      :api="api"
    />

    <div
      v-if="errorMessage"
      ref="errorRef"
      tabindex="-1"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <p class="text-xs text-muted">
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
