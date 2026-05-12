<script setup lang="ts">
import type { ReportType, ReportsListResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data, refresh } = await useFetch<ReportsListResponse>("/api/admin/reports", {
  default: () => ({ reports: [] }),
});

const reports = computed(() => data.value?.reports ?? []);

function getTypeLabel(type: ReportType) {
  return type === "bug" ? "不具合" : "要望";
}

function getTypeClass(type: ReportType) {
  return type === "bug"
    ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("ja-JP");
}

useSeoMeta({ title: "不具合・要望管理" });
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold tracking-tight text-foreground">不具合・要望</h1>

    <div v-if="reports.length" class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table class="min-w-full divide-y divide-border">
        <thead class="bg-background">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">内容</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted lg:table-cell">送信者</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted md:table-cell">送信日時</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="report in reports" :key="report.id" class="align-top hover:bg-surface-hover">
            <td class="px-4 py-4">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="getTypeClass(report.reportType)"
                >
                  {{ getTypeLabel(report.reportType) }}
                </span>
                <p class="font-medium text-foreground">{{ report.title }}</p>
              </div>
              <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{{ report.detail }}</p>
              <div class="mt-3 space-y-1 text-xs text-muted md:hidden">
                <p>{{ formatCreatedAt(report.createdAt) }}</p>
                <p>{{ report.userEmail }}</p>
              </div>
            </td>
            <td class="hidden px-4 py-4 text-sm text-muted lg:table-cell">
              {{ report.userEmail }}
            </td>
            <td class="hidden px-4 py-4 text-sm text-muted md:table-cell">
              {{ formatCreatedAt(report.createdAt) }}
            </td>
            <td class="px-4 py-4 text-right">
              <AdminDeleteButton
                :fetch-url="`/api/admin/reports/${report.id}`"
                confirm-message="この報告を削除しますか？この操作は取り消せません。"
                @deleted="refresh"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
      報告はまだありません。
    </p>
  </div>
</template>
