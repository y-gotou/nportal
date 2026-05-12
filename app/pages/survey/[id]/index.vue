<script setup lang="ts">
import { secondaryButtonClass } from "~/utils/ui";
import { getSurveyStatusLabel } from "~~/utils/survey";

const route = useRoute();
const surveyId = Number(route.params.id);
const { survey, responses, myAnswers } = await useSurveyDetail(surveyId, {
  requireActive: true,
  failureMessage: "Failed to load survey",
});

const hasResponded = computed(() => Object.keys(myAnswers).length > 0);
const canEdit = computed(() => survey.status === "active");
const isEditing = ref(
  hasResponded.value && canEdit.value && route.query.edit === "1",
);

useSeoMeta({
  title: survey.title,
  description: survey.description,
});
</script>

<template>
  <PageContainer size="narrow">
    <div class="mb-4 flex flex-wrap gap-3">
      <NuxtLink
        to="/survey"
        :class="secondaryButtonClass"
      >
        <IconArrowLeft />
        一覧へ戻る
      </NuxtLink>
      <NuxtLink
        v-if="(survey.responseCount ?? 0) > 0"
        :to="`/survey/${survey.id}/results`"
        :class="secondaryButtonClass"
      >
        結果を見る
      </NuxtLink>
    </div>

    <div class="space-y-4">
      <SectionHeader
        :title="survey.title"
        :description="survey.description"
      />

      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-surface-hover px-3 py-1.5 text-sm text-muted">
          設問数: {{ survey.questions.length }}問
        </span>
        <span
          class="rounded-full px-3 py-1.5 text-sm font-medium"
          :class="canEdit ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-surface-hover text-muted'"
        >
          {{ getSurveyStatusLabel(survey.status) }}
        </span>
        <span
          v-if="hasResponded"
          class="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
        >
          回答済み
        </span>
      </div>
    </div>

    <div
      v-if="hasResponded && !isEditing"
      class="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20"
    >
      <div class="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <div class="space-y-2">
          <p class="font-medium text-green-800 dark:text-green-300">このアンケートには既に回答済みです</p>
          <p class="text-sm text-green-700 dark:text-green-400">
            {{ canEdit ? "受付中の間は回答を編集できます。" : "回答の集計結果は結果ページで確認できます。" }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="canEdit"
              type="button"
              class="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              @click="isEditing = true"
            >
              回答を編集
            </button>
            <NuxtLink
              :to="`/survey/${survey.id}/results`"
              class="inline-block rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900/30"
            >
              結果を見る
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="mt-8 space-y-4">
      <SurveyForm
        :survey="survey"
        :initial-answers="isEditing ? myAnswers : undefined"
        :is-editing="isEditing"
      />
    </div>
  </PageContainer>
</template>
