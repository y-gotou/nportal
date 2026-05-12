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
      <h1 class="text-xl font-bold tracking-tight text-foreground">スケジュール</h1>
      <NuxtLink
        to="/admin/schedule/new"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        新規作成
      </NuxtLink>
    </div>

    <div v-if="schedule.length" class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table class="min-w-full divide-y divide-border">
        <thead class="bg-background">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">タイトル</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted sm:table-cell">開催日</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="item in schedule" :key="item.id" class="hover:bg-surface-hover">
            <td class="px-4 py-3">
              <p class="font-medium text-foreground">{{ item.title }}</p>
              <p class="mt-0.5 text-xs text-muted sm:hidden">{{ formatDisplayDate(item.date) }}</p>
            </td>
            <td class="hidden px-4 py-3 text-sm text-muted sm:table-cell">
              {{ formatDisplayDate(item.date) }}
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/schedule/${item.id}/edit`"
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
      スケジュールはまだ登録されていません。
    </p>
  </div>
</template>
