<script setup lang="ts">
import type { SurveyGetResponse } from "~~/types/portal";

const route = useRoute();
const surveyId = Number(route.params.id);

const { data, error } = await useFetch<SurveyGetResponse>("/api/survey", {
  query: { surveyId },
});

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || "Failed to load survey",
  });
}

const survey = data.value?.survey;

if (!survey || !survey.isActive) {
  throw createError({
    statusCode: 404,
    statusMessage: "Survey not found",
  });
}

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
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        一覧へ戻る
      </NuxtLink>
      <NuxtLink
        :to="`/survey/${survey.id}/results`"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        結果を見る
      </NuxtLink>
    </div>

    <div class="space-y-4">
      <SectionHeader
        eyebrow="Survey Form"
        :title="survey.title"
        :description="survey.description"
      />

      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          設問数: {{ survey.questions.length }}問
        </span>
        <span class="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600">
          回答受付中
        </span>
      </div>
    </div>

    <div class="mt-8 space-y-4">
      <SectionHeader
        eyebrow="Answer"
        title="アンケートに回答する"
        description="選択式と自由記述の両方に対応しています。"
      />

      <SurveyForm :survey="survey" />
    </div>
  </PageContainer>
</template>
