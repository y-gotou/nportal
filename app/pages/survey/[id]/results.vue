<script setup lang="ts">
import { secondaryButtonClass } from "~/utils/ui";

const route = useRoute();
const surveyId = Number(route.params.id);
const { survey, responses, myAnswers } = await useSurveyDetail(surveyId, {
  failureMessage: "Failed to load survey results",
});

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
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          回答数: {{ responses.length }}件
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          設問数: {{ survey.questions.length }}問
        </span>
        <span
          class="rounded-full px-3 py-1.5 text-sm font-medium"
          :class="
            Object.keys(myAnswers).length > 0
              ? 'bg-green-50 text-green-700'
              : survey.status === 'active'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-slate-100 text-slate-600'
          "
        >
          {{
            Object.keys(myAnswers).length > 0
              ? "回答済み"
              : survey.status === 'active'
                ? "受付中"
                : "停止中"
          }}
        </span>
      </div>
    </div>

    <div v-if="responses.length" class="mt-8 space-y-4">
      <SurveyResults :survey="survey" :responses="responses" :my-answers="myAnswers" />
    </div>

    <div
      v-else
      class="mt-8 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
    >
      <h2 class="text-xl font-semibold tracking-tight text-slate-900">まだ回答がありません</h2>
      <p class="text-sm leading-6 text-slate-500">
        最初の回答を受け付けるまで、ここには集計結果が表示されません。
      </p>
    </div>
  </PageContainer>
</template>
