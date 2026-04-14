<script setup lang="ts">
import type { SurveysResponse } from "~~/types/portal";
import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceCardClass,
} from "~/utils/ui";

const { data, error } = await useFetch<SurveysResponse>("/api/surveys");

const surveys = computed(() => data.value?.surveys ?? []);

useSeoMeta({
  title: "アンケート",
  description: "勉強会のフィードバックやテーマ希望アンケートの一覧です。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader
      title="アンケート一覧"
      description="回答受付中のアンケートを確認できます。"
    />

    <!-- APIエラー表示 -->
    <div
      v-if="error"
      class="rounded-xl border border-rose-200 bg-rose-50 p-6"
      role="alert"
    >
      <p class="font-medium text-rose-800">アンケートの読み込みに失敗しました</p>
      <p class="mt-1 text-sm text-rose-600">しばらくしてからページを再読み込みしてください。</p>
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
              <h2 class="min-w-0 text-pretty text-xl font-semibold tracking-tight text-slate-900">
                {{ survey.title }}
              </h2>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  survey.hasResponded
                    ? 'bg-green-50 text-green-700'
                    : survey.isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-slate-100 text-slate-500'
                "
              >
                {{ survey.hasResponded ? "回答済み" : survey.isActive ? "受付中" : "終了" }}
              </span>
            </div>
            <p class="text-sm leading-6 text-slate-500">{{ survey.description }}</p>
            <div class="flex flex-wrap gap-2 text-sm text-slate-500">
              <span class="rounded-full bg-slate-100 px-3 py-1">設問数 {{ survey.questions.length }}問</span>
              <span class="rounded-full bg-slate-100 px-3 py-1">
                回答 {{ survey.responseCount ?? 0 }}件
              </span>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-3">
            <NuxtLink
              v-if="survey.isActive && !survey.hasResponded"
              :to="`/survey/${survey.id}`"
              :class="primaryButtonClass"
            >
              回答する
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
      class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      アンケートはまだありません。
    </p>
  </PageContainer>
</template>
