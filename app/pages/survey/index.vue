<script setup lang="ts">
import type { SurveysResponse } from "~~/types/portal";

const { data, error } = await useFetch<SurveysResponse>("/api/surveys");

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || "Failed to load surveys",
  });
}

const surveys = computed(() => data.value?.surveys ?? []);

useSeoMeta({
  title: "アンケート",
  description: "勉強会のフィードバックやテーマ希望アンケートの一覧です。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader
      eyebrow="Survey"
      title="アンケート一覧"
      description="回答受付中のフォームと、集計結果ページへの導線をまとめています。"
    />

    <div v-if="surveys.length" class="home-grid home-grid--two">
      <article v-for="survey in surveys" :key="survey.id" class="panel stack-md">
        <div class="panel__row">
          <h2 class="panel__title">{{ survey.title }}</h2>
          <span class="tag" :class="survey.isActive ? 'tag--accent' : 'tag--muted'">
            {{ survey.isActive ? "受付中" : "終了" }}
          </span>
        </div>
        <p class="section-header__description">{{ survey.description }}</p>
        <p class="meta-text">
          設問数: {{ survey.questions.length }} / 作成日: {{ survey.createdAt }}
        </p>
        <div class="button-row">
          <NuxtLink
            v-if="survey.isActive"
            :to="`/survey/${survey.id}`"
            class="button button--primary"
          >
            回答する
          </NuxtLink>
          <NuxtLink :to="`/survey/${survey.id}/results`" class="button button--secondary">
            結果を見る
          </NuxtLink>
        </div>
      </article>
    </div>

    <p v-else class="empty-state">
      アンケートはまだありません。
    </p>
  </PageContainer>
</template>
