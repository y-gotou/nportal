<script setup lang="ts">
import { secondaryButtonClass } from "~/utils/ui";

const route = useRoute();
const surveyId = Number(route.params.id);
const { survey, responses } = await useSurveyDetail(surveyId, {
  requireActive: true,
  failureMessage: "Failed to load survey",
});

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
      </div>
    </div>

    <div class="mt-8 space-y-4">
      <SectionHeader
        title="アンケートに回答する"
      />

      <SurveyForm :survey="survey" />
    </div>
  </PageContainer>
</template>
