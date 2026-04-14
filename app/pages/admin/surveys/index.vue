<script setup lang="ts">
import type { SurveysResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data, refresh } = await useFetch<SurveysResponse>("/api/surveys", {
  default: () => ({ surveys: [] }),
});

const surveys = computed(() => data.value?.surveys ?? []);

async function toggleActive(id: number, current: boolean) {
  await $fetch(`/api/admin/surveys/${id}`, {
    method: "PUT",
    body: { isActive: !current },
  });
  await refresh();
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
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">回答数</th>
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
              {{ survey.responseCount ?? 0 }}件
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                :class="survey.isActive
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                @click="toggleActive(survey.id, survey.isActive)"
              >
                {{ survey.isActive ? "受付中" : "停止中" }}
              </button>
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
