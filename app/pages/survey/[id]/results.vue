<script setup lang="ts">
import { secondaryButtonClass } from "~/utils/ui";
import { getSurveyStatusLabel } from "~~/utils/survey";

const route = useRoute();
const surveyId = Number(route.params.id);
const { survey, responses, myAnswers } = await useSurveyDetail(surveyId, {
  failureMessage: "Failed to load survey results",
});

const hasResponded = computed(() => Object.keys(myAnswers).length > 0);

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
        :class="secondaryButtonClass"
      >
        <IconArrowLeft />
        一覧へ戻る
      </NuxtLink>
      <NuxtLink
        v-if="survey.status === 'active' && Object.keys(myAnswers).length === 0"
        :to="`/survey/${survey.id}`"
        :class="secondaryButtonClass"
      >
        回答する
      </NuxtLink>
    </div>

    <div class="space-y-4">
      <SectionHeader :title="`${survey.title} の集計結果`" />

      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-surface-hover px-3 py-1.5 text-sm text-muted">
          回答者数: {{ survey.responseCount ?? 0 }}人
        </span>
        <span class="rounded-full bg-surface-hover px-3 py-1.5 text-sm text-muted">
          設問数: {{ survey.questions.length }}問
        </span>
        <span
          class="rounded-full px-3 py-1.5 text-sm font-medium"
          :class="survey.status === 'active' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-surface-hover text-muted'"
        >
          {{ getSurveyStatusLabel(survey.status) }}
        </span>
        <span
          v-if="hasResponded"
          class="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
        >
          回答済み
        </span>
      </div>
    </div>

    <div v-if="(survey.responseCount ?? 0) > 0" class="mt-8 space-y-4">
      <SurveyResults :survey="survey" :responses="responses" :my-answers="myAnswers" />
    </div>

    <div
      v-else
      class="mt-8 space-y-4 rounded-xl border border-border bg-background p-6 shadow-sm"
    >
      <h2 class="text-xl font-semibold tracking-tight text-foreground">まだ回答がありません</h2>
      <p class="text-sm leading-6 text-muted">
        最初の回答を受け付けるまで、ここには集計結果が表示されません。
      </p>
    </div>
  </PageContainer>
</template>
