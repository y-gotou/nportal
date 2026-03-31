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

const survey = computed(() => data.value?.survey);
const responses = computed(() => data.value?.responses ?? []);

if (!survey.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Survey not found",
  });
}

useSeoMeta({
  title: `${survey.value.title} の結果`,
  description: survey.value.description,
});
</script>

<template>
  <PageContainer size="medium">
    <PageHero
      eyebrow="Survey Results"
      :title="`${survey.title} の集計結果`"
      :description="survey.description"
    >
      <template #meta>
        <div class="hero-meta-grid">
          <div>
            <p class="hero-meta-grid__label">回答数</p>
            <p>{{ responses.length }}件</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">設問数</p>
            <p>{{ survey.questions.length }}問</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">状態</p>
            <p>{{ survey.isActive ? "受付中" : "受付終了" }}</p>
          </div>
        </div>
      </template>
      <template #actions>
        <NuxtLink to="/survey" class="button button--hero-secondary">
          一覧へ戻る
        </NuxtLink>
        <NuxtLink
          v-if="survey.isActive"
          :to="`/survey/${survey.id}`"
          class="button button--hero-secondary"
        >
          回答する
        </NuxtLink>
      </template>
    </PageHero>

    <div v-if="responses.length" class="stack-md">
      <SectionHeader
        eyebrow="Overview"
        title="設問ごとの回答内訳"
        description="選択式は分布、自由記述は一覧で確認できます。"
      />
      <SurveyResults :survey="survey" :responses="responses" />
    </div>

    <div v-else class="panel panel--soft stack-md">
      <h2 class="panel__title">まだ回答がありません</h2>
      <p class="section-header__description">
        最初の回答を受け付けるまで、ここには集計結果が表示されません。
      </p>
      <div v-if="survey.isActive" class="button-row">
        <NuxtLink :to="`/survey/${survey.id}`" class="button button--primary">
          回答する
        </NuxtLink>
      </div>
    </div>
  </PageContainer>
</template>
