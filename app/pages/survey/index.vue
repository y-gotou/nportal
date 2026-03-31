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

    <div v-if="surveys.length" class="grid gap-4 md:grid-cols-2">
      <article
        v-for="survey in surveys"
        :key="survey.id"
        class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-xl font-semibold tracking-tight text-slate-900">{{ survey.title }}</h2>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="
              survey.isActive
                ? 'bg-blue-50 text-blue-600'
                : 'bg-slate-100 text-slate-500'
            "
          >
            {{ survey.isActive ? "受付中" : "終了" }}
          </span>
        </div>
        <p class="text-sm leading-6 text-slate-500">{{ survey.description }}</p>
        <p class="text-sm text-slate-500">
          設問数: {{ survey.questions.length }} / 作成日: {{ survey.createdAt }}
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            v-if="survey.isActive"
            :to="`/survey/${survey.id}`"
            class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            回答する
          </NuxtLink>
          <NuxtLink
            :to="`/survey/${survey.id}/results`"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            結果を見る
          </NuxtLink>
        </div>
      </article>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      アンケートはまだありません。
    </p>
  </PageContainer>
</template>
