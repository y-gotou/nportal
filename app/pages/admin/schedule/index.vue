<script setup lang="ts">
import type { ScheduleListResponse } from "~~/types/portal";
import { formatDisplayDate } from "~~/utils/content";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data } = await useFetch<ScheduleListResponse>("/api/schedule", {
  default: () => ({ schedule: [] }),
});

const schedule = computed(() =>
  [...(data.value?.schedule ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
);

useSeoMeta({ title: "スケジュール管理" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight text-slate-900">スケジュール</h1>
      <NuxtLink
        to="/admin/schedule/new"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        新規作成
      </NuxtLink>
    </div>

    <div v-if="schedule.length" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">タイトル</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">開催日</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="item in schedule" :key="item.id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <p class="font-medium text-slate-900">{{ item.title }}</p>
              <p class="mt-0.5 text-xs text-slate-500 sm:hidden">{{ formatDisplayDate(item.date) }}</p>
            </td>
            <td class="hidden px-4 py-3 text-sm text-slate-600 sm:table-cell">
              {{ formatDisplayDate(item.date) }}
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/schedule/${item.id}/edit`"
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
      スケジュールはまだ登録されていません。
    </p>
  </div>
</template>
