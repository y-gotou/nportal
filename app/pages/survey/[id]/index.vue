<script setup lang="ts">
import { secondaryButtonClass } from "~/utils/ui";

const route = useRoute();
const surveyId = Number(route.params.id);
const { survey, responses, myAnswers } = await useSurveyDetail(surveyId, {
  requireActive: true,
  failureMessage: "Failed to load survey",
});

const hasResponded = computed(() => Object.keys(myAnswers).length > 0);

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
        一覧へ戻る
      </NuxtLink>
      <NuxtLink
        v-if="responses.length"
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
        <span class="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600">
          回答受付中
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          回答 {{ responses.length }}件
        </span>
        <span
          v-if="hasResponded"
          class="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700"
        >
          回答済み
        </span>
      </div>
    </div>

    <!-- 回答済みの場合 -->
    <div v-if="hasResponded" class="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
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
          <p class="text-sm text-green-700">回答の集計結果は結果ページで確認できます。</p>
          <NuxtLink
            :to="`/survey/${survey.id}/results`"
            class="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            結果を見る
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- 未回答の場合 -->
    <div v-else class="mt-8 space-y-4">
      <SectionHeader
        title="アンケートに回答する"
      />

      <SurveyForm :survey="survey" />
    </div>
  </PageContainer>
</template>
