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

const survey = computed(() => data.value?.survey);

if (!survey.value || !survey.value.isActive) {
  throw createError({
    statusCode: 404,
    statusMessage: "Survey not found",
  });
}

useSeoMeta({
  title: survey.value.title,
  description: survey.value.description,
});
</script>

<template>
  <PageContainer size="narrow">
    <PageHero
      eyebrow="Survey Form"
      :title="survey.title"
      :description="survey.description"
    >
      <template #meta>
        <div class="hero-meta-grid">
          <div>
            <p class="hero-meta-grid__label">設問数</p>
            <p>{{ survey.questions.length }}問</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">状態</p>
            <p>回答受付中</p>
          </div>
        </div>
      </template>
      <template #actions>
        <NuxtLink to="/survey" class="button button--hero-secondary">
          一覧へ戻る
        </NuxtLink>
        <NuxtLink :to="`/survey/${survey.id}/results`" class="button button--hero-secondary">
          結果を見る
        </NuxtLink>
      </template>
    </PageHero>

    <SectionHeader
      eyebrow="Answer"
      title="アンケートに回答する"
      description="選択式と自由記述の両方に対応しています。"
    />

    <SurveyForm :survey="survey" />
  </PageContainer>
</template>
