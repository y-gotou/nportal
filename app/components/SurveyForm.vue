<script setup lang="ts">
import type { Survey, SurveyAnswerValue } from "~~/types/portal";
import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceCardClass,
} from "~/utils/ui";
import { serializeSurveyAnswer } from "~~/utils/survey";

const props = defineProps<{
  survey: Survey;
}>();

const answers = ref<Record<number, SurveyAnswerValue>>({});
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref("");

function getMultipleAnswers(questionId: number) {
  const answer = answers.value[questionId];
  return Array.isArray(answer) ? answer : [];
}

function toggleMultipleAnswer(questionId: number, option: string) {
  const selected = getMultipleAnswers(questionId);
  const next = selected.includes(option)
    ? selected.filter((item) => item !== option)
    : [...selected, option];

  answers.value = {
    ...answers.value,
    [questionId]: next,
  };
}

function setSingleAnswer(questionId: number, answer: string) {
  answers.value = {
    ...answers.value,
    [questionId]: answer,
  };
}

function getTextAnswer(questionId: number) {
  const answer = answers.value[questionId];
  return typeof answer === "string" ? answer : "";
}

async function submitSurvey() {
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
  } catch {
    errorMessage.value = "送信に失敗しました。時間をおいて再度お試しください。";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div
    v-if="isSubmitted"
    aria-live="polite"
    class="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
  >
    <h2 class="text-xl font-semibold tracking-tight text-slate-900">回答ありがとうございました</h2>
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
        一覧へ戻る
      </NuxtLink>
    </div>
  </div>

  <form v-else class="space-y-6" @submit.prevent="submitSurvey">
    <section
      v-for="(question, index) in survey.questions"
      :key="question.id"
      :class="`${surfaceCardClass} space-y-4`"
    >
      <div class="space-y-1">
        <p class="text-xs font-semibold tracking-[0.16em] text-slate-500">
          Q{{ index + 1 }}
        </p>
        <h3 class="text-lg font-semibold tracking-tight text-slate-900">
          {{ question.questionText }}
        </h3>
      </div>

      <div v-if="question.questionType === 'single_choice'" class="space-y-3">
        <label
          v-for="option in question.options"
          :key="option"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
        >
          <input
            :name="`question-${question.id}`"
            type="radio"
            :value="option"
            :checked="getTextAnswer(question.id) === option"
            class="mt-0.5 h-4 w-4 border-slate-300 text-blue-500 focus:ring-blue-500"
            @change="setSingleAnswer(question.id, option)"
          >
          <span>{{ option }}</span>
        </label>
      </div>

      <div v-else-if="question.questionType === 'multiple_choice'" class="space-y-3">
        <label
          v-for="option in question.options"
          :key="option"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
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
      </div>

      <textarea
        v-else
        :value="getTextAnswer(question.id)"
        :name="`question-${question.id}`"
        autocomplete="off"
        class="min-h-32 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        rows="5"
        placeholder="自由にご記入ください…"
        @input="setSingleAnswer(question.id, ($event.target as HTMLTextAreaElement).value)"
      />
    </section>

    <p
      v-if="errorMessage"
      aria-live="polite"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600"
    >
      {{ errorMessage }}
    </p>

    <button
      :class="`${primaryButtonClass} w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-blue-300`"
      type="submit"
      :disabled="isSubmitting"
    >
      {{ isSubmitting ? "送信中…" : "回答を送信" }}
    </button>
  </form>
</template>
