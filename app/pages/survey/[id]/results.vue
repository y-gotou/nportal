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
    statusMessage: error.value.statusMessage || "Failed to load survey results",
  });
}

const survey = data.value?.survey;
const responses = data.value?.responses ?? [];

if (!survey) {
  throw createError({
    statusCode: 404,
    statusMessage: "Survey not found",
  });
}

useSeoMeta({
  title: `${survey.title} の結果`,
  description: survey.description,
});
</script>

<template>
  <PageContainer size="medium">
    <div class="mb-4 flex flex-wrap gap-3">
      <NuxtLink
        to="/survey"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        一覧へ戻る
      </NuxtLink>
      <NuxtLink
        v-if="survey.isActive"
        :to="`/survey/${survey.id}`"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        回答する
      </NuxtLink>
    </div>

    <div class="space-y-4">
      <SectionHeader
        eyebrow="Survey Results"
        :title="`${survey.title} の集計結果`"
        :description="survey.description"
      />

      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          回答数: {{ responses.length }}件
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          設問数: {{ survey.questions.length }}問
        </span>
        <span
          class="rounded-full px-3 py-1.5 text-sm font-medium"
          :class="survey.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'"
        >
          {{ survey.isActive ? "受付中" : "受付終了" }}
        </span>
      </div>
    </div>

    <div v-if="responses.length" class="mt-8 space-y-4">
      <SectionHeader
        eyebrow="Overview"
        title="設問ごとの回答内訳"
        description="選択式は分布、自由記述は一覧で確認できます。"
      />
      <SurveyResults :survey="survey" :responses="responses" />
    </div>

    <div
      v-else
      class="mt-8 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
    >
      <h2 class="text-xl font-semibold tracking-tight text-slate-900">まだ回答がありません</h2>
      <p class="text-sm leading-6 text-slate-500">
        最初の回答を受け付けるまで、ここには集計結果が表示されません。
      </p>
      <div v-if="survey.isActive" class="flex flex-wrap gap-3">
        <NuxtLink
          :to="`/survey/${survey.id}`"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          回答する
        </NuxtLink>
      </div>
    </div>
  </PageContainer>
</template>
