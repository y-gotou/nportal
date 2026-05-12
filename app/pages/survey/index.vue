<script setup lang="ts">
import type { SurveyStatus, SurveysResponse } from "~~/types/portal";
import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceCardClass,
} from "~/utils/ui";
import { getSurveyStatusLabel } from "~~/utils/survey";

const { data, error } = await useFetch<SurveysResponse>("/api/surveys");

const surveys = computed(() => data.value?.surveys ?? []);

function getSurveyStatusClass(status: SurveyStatus) {
  return status === "active"
    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
    : "bg-surface-hover text-muted";
}

useSeoMeta({
  title: "アンケート",
  description: "回答可能なアンケートと過去アンケートの結果を確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader title="アンケート一覧" />

    <div
      v-if="error"
      class="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20"
      role="alert"
    >
      <p class="font-medium text-rose-800 dark:text-rose-300">アンケートの読み込みに失敗しました</p>
      <p class="mt-1 text-sm text-rose-600 dark:text-rose-400">しばらくしてからページを再読み込みしてください。</p>
    </div>

    <div v-else-if="surveys.length" class="space-y-3">
      <article
        v-for="survey in surveys"
        :key="survey.id"
        :class="surfaceCardClass"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 space-y-2">
            <div class="flex min-w-0 flex-wrap items-start gap-2">
              <h2 class="min-w-0 text-pretty text-xl font-semibold tracking-tight text-foreground">
                {{ survey.title }}
              </h2>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getSurveyStatusClass(survey.status)"
              >
                {{ getSurveyStatusLabel(survey.status) }}
              </span>
              <span
                v-if="survey.hasResponded"
                class="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
              >
                回答済み
              </span>
            </div>
            <p class="text-sm leading-6 text-muted">{{ survey.description }}</p>
            <div class="flex flex-wrap gap-2 text-sm text-muted">
              <span class="rounded-full bg-surface-hover px-3 py-1">設問数 {{ survey.questions.length }}問</span>
              <span class="rounded-full bg-surface-hover px-3 py-1">
                回答者 {{ survey.responseCount ?? 0 }}人
              </span>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-3">
            <NuxtLink
              v-if="survey.status === 'active' && !survey.hasResponded"
              :to="`/survey/${survey.id}`"
              :class="primaryButtonClass"
            >
              回答する
            </NuxtLink>
            <NuxtLink
              v-else-if="survey.status === 'active' && survey.hasResponded"
              :to="`/survey/${survey.id}?edit=1`"
              :class="primaryButtonClass"
            >
              回答を編集
            </NuxtLink>
            <NuxtLink
              v-if="(survey.responseCount ?? 0) > 0"
              :to="`/survey/${survey.id}/results`"
              :class="secondaryButtonClass"
            >
              結果を見る
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      アンケートはまだありません。
    </p>
  </PageContainer>
</template>
