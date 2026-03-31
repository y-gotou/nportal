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
        <div class="grid gap-4 text-sm md:grid-cols-3 md:text-base">
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              回答数
            </p>
            <p>{{ responses.length }}件</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              設問数
            </p>
            <p>{{ survey.questions.length }}問</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              状態
            </p>
            <p>{{ survey.isActive ? "受付中" : "受付終了" }}</p>
          </div>
        </div>
      </template>
      <template #actions>
        <NuxtLink
          to="/survey"
          class="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          一覧へ戻る
        </NuxtLink>
        <NuxtLink
          v-if="survey.isActive"
          :to="`/survey/${survey.id}`"
          class="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          回答する
        </NuxtLink>
      </template>
    </PageHero>

    <div v-if="responses.length" class="space-y-4">
      <SectionHeader
        eyebrow="Overview"
        title="設問ごとの回答内訳"
        description="選択式は分布、自由記述は一覧で確認できます。"
      />
      <SurveyResults :survey="survey" :responses="responses" />
    </div>

    <div
      v-else
      class="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
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
