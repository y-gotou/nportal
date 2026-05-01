<script setup lang="ts">
import { secondaryButtonClass } from "~/utils/ui";
import {
  buildSurveyAvailabilityText,
  getSurveyStatusLabel,
} from "~~/utils/survey";

const route = useRoute();
const surveyId = Number(route.params.id);
const { survey, responses, myAnswers } = await useSurveyDetail(surveyId, {
  failureMessage: "Failed to load survey",
});

const hasResponded = computed(() => Object.keys(myAnswers).length > 0);
const canEdit = computed(() => survey.status === "active");
const availabilityText = computed(() => buildSurveyAvailabilityText(survey));
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
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          設問数: {{ survey.questions.length }}問
        </span>
        <span
          class="rounded-full px-3 py-1.5 text-sm font-medium"
          :class="canEdit ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'"
        >
          {{ getSurveyStatusLabel(survey.status) }}
        </span>
        <span
          v-if="hasResponded"
          class="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700"
        >
          回答済み
        </span>
        <span
          v-if="availabilityText"
          class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600"
        >
          {{ availabilityText }}
        </span>
      </div>
    </div>

    <!-- 回答済み & 未編集モード -->
    <div
      v-if="hasResponded && !isEditing"
      class="mt-8 rounded-xl border border-green-200 bg-green-50 p-6"
    >
      <div class="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mt-0.5 h-5 w-5 shrink-0 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <div class="space-y-2">
          <p class="font-medium text-green-800">このアンケートには既に回答済みです</p>
          <p class="text-sm text-green-700">
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
              class="inline-block rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              結果を見る
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 未回答 or 編集モード -->
    <div v-else-if="canEdit" class="mt-8 space-y-4">
      <SurveyForm
        :survey="survey"
        :initial-answers="isEditing ? myAnswers : undefined"
        :is-editing="isEditing"
      />
    </div>

    <div
      v-else
      class="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6"
    >
      <p class="font-medium text-slate-800">このアンケートは受付を終了しています</p>
      <p class="mt-1 text-sm leading-6 text-slate-500">回答の集計結果は結果ページで確認できます。</p>
    </div>
  </PageContainer>
</template>
