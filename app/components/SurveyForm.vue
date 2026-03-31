<script setup lang="ts">
import type { Survey } from "~~/types/portal";

const props = defineProps<{
  survey: Survey;
}>();

const answers = ref<Record<number, string>>({});
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref("");

function getMultipleAnswers(questionId: number) {
  try {
    return JSON.parse(answers.value[questionId] ?? "[]") as string[];
  } catch {
    return [];
  }
}

function toggleMultipleAnswer(questionId: number, option: string) {
  const selected = getMultipleAnswers(questionId);
  const next = selected.includes(option)
    ? selected.filter((item) => item !== option)
    : [...selected, option];

  answers.value = {
    ...answers.value,
    [questionId]: JSON.stringify(next),
  };
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
          answer: answers.value[question.id] ?? "",
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
    class="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
  >
    <h2 class="text-xl font-semibold tracking-tight text-slate-900">回答ありがとうございました</h2>
    <p class="text-sm leading-6 text-slate-600">
      回答は保存されました。結果ページから集計を確認できます。
    </p>
    <div class="flex flex-wrap gap-3">
      <NuxtLink
        :to="`/survey/${survey.id}/results`"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
      >
        結果を見る
      </NuxtLink>
      <NuxtLink
        to="/survey"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        一覧へ戻る
      </NuxtLink>
    </div>
  </div>

  <form v-else class="space-y-6" @submit.prevent="submitSurvey">
    <section
      v-for="(question, index) in survey.questions"
      :key="question.id"
      class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
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
            :checked="answers[question.id] === option"
            class="mt-0.5 h-4 w-4 border-slate-300 text-blue-500 focus:ring-blue-500"
            @change="answers = { ...answers, [question.id]: option }"
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
        :value="answers[question.id] ?? ''"
        class="min-h-32 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        rows="5"
        placeholder="自由にご記入ください"
        @input="
          answers = {
            ...answers,
            [question.id]: ($event.target as HTMLTextAreaElement).value,
          }
        "
      />
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600"
    >
      {{ errorMessage }}
    </p>

    <button
      class="inline-flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
      type="submit"
      :disabled="isSubmitting"
    >
      {{ isSubmitting ? "送信中..." : "回答を送信" }}
    </button>
  </form>
</template>
