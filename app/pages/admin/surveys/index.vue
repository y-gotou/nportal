<script setup lang="ts">
import type { SurveysResponse } from "~~/types/portal";
import {
  buildSurveyAvailabilityText,
  getSurveyStatusLabel,
} from "~~/utils/survey";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data } = await useFetch<SurveysResponse>("/api/surveys", {
  default: () => ({ surveys: [] }),
});

const surveys = computed(() => data.value?.surveys ?? []);

function getAdminSurveyStatusClass(survey: SurveysResponse["surveys"][number]) {
  if (survey.status === "draft" && survey.publishStartsAt) {
    return "bg-amber-50 text-amber-700";
  }
  if (survey.status === "draft") return "bg-yellow-50 text-yellow-700";
  if (survey.status === "active") return "bg-green-50 text-green-700";
  return "bg-slate-100 text-slate-500";
}

function getAdminSurveyStatusLabel(survey: SurveysResponse["surveys"][number]) {
  if (survey.status === "draft" && survey.publishStartsAt) {
    return "予約中";
  }

  return getSurveyStatusLabel(survey.status);
}

useSeoMeta({ title: "アンケート管理" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight text-slate-900">アンケート</h1>
      <NuxtLink
        to="/admin/surveys/new"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        新規作成
      </NuxtLink>
    </div>

    <div v-if="surveys.length" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">タイトル</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">設問数</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">回答者数</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">公開・期限</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">状態</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="survey in surveys" :key="survey.id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <p class="font-medium text-slate-900">{{ survey.title }}</p>
            </td>
            <td class="hidden px-4 py-3 text-sm text-slate-600 sm:table-cell">
              {{ survey.questions.length }}問
            </td>
            <td class="hidden px-4 py-3 text-sm text-slate-600 sm:table-cell">
              {{ survey.responseCount ?? 0 }}人
            </td>
            <td class="hidden px-4 py-3 text-sm text-slate-600 lg:table-cell">
              {{ buildSurveyAvailabilityText(survey) || "未設定" }}
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getAdminSurveyStatusClass(survey)"
              >
                {{ getAdminSurveyStatusLabel(survey) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/surveys/${survey.id}/edit`"
                class="text-sm font-medium text-blue-600 hover:underline"
              >
                編集
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
      アンケートはまだ登録されていません。
    </p>
  </div>
</template>
