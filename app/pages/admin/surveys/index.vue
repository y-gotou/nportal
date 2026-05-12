<script setup lang="ts">
import type { SurveyStatus, SurveysResponse } from "~~/types/portal";
import { getSurveyStatusLabel } from "~~/utils/survey";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data } = await useFetch<SurveysResponse>("/api/surveys", {
  default: () => ({ surveys: [] }),
});

const surveys = computed(() => data.value?.surveys ?? []);

function getStatusClass(status: SurveyStatus) {
  if (status === "draft") return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
  if (status === "active") return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
  return "bg-surface-hover text-muted";
}

useSeoMeta({ title: "アンケート管理" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight text-foreground">アンケート</h1>
      <NuxtLink
        to="/admin/surveys/new"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        新規作成
      </NuxtLink>
    </div>

    <div v-if="surveys.length" class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table class="min-w-full divide-y divide-border">
        <thead class="bg-background">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">タイトル</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted sm:table-cell">設問数</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted sm:table-cell">回答者数</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">状態</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="survey in surveys" :key="survey.id" class="hover:bg-surface-hover">
            <td class="px-4 py-3">
              <p class="font-medium text-foreground">{{ survey.title }}</p>
            </td>
            <td class="hidden px-4 py-3 text-sm text-muted sm:table-cell">
              {{ survey.questions.length }}問
            </td>
            <td class="hidden px-4 py-3 text-sm text-muted sm:table-cell">
              {{ survey.responseCount ?? 0 }}人
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getStatusClass(survey.status)"
              >
                {{ getSurveyStatusLabel(survey.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/surveys/${survey.id}/edit`"
                class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                編集
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
      アンケートはまだ登録されていません。
    </p>
  </div>
</template>
