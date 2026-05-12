<script setup lang="ts">
import type { ResourcesListResponse } from "~~/types/portal";
import { formatDisplayDate } from "~~/utils/content";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data } = await useFetch<ResourcesListResponse>("/api/resources", {
  default: () => ({ resources: [] }),
});

const resources = computed(() => data.value?.resources ?? []);

useSeoMeta({ title: "資料管理" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight text-foreground">資料</h1>
      <NuxtLink
        to="/admin/resources/new"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        新規作成
      </NuxtLink>
    </div>

    <div v-if="resources.length" class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table class="min-w-full divide-y divide-border">
        <thead class="bg-background">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">タイトル</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted sm:table-cell">日付</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted md:table-cell">種類</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="resource in resources" :key="resource.id" class="hover:bg-surface-hover">
            <td class="px-4 py-3">
              <p class="font-medium text-foreground">{{ resource.title }}</p>
              <p class="mt-0.5 text-xs text-muted">
                {{ resource.sourceType === "file" ? resource.fileName : resource.url }}
              </p>
              <p class="mt-0.5 text-xs text-muted sm:hidden">{{ formatDisplayDate(resource.date) }}</p>
            </td>
            <td class="hidden px-4 py-3 text-sm text-muted sm:table-cell">
              {{ formatDisplayDate(resource.date) }}
            </td>
            <td class="hidden px-4 py-3 md:table-cell">
              <span class="rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted">{{ resource.type }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/resources/${resource.id}/edit`"
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
      資料はまだ登録されていません。
    </p>
  </div>
</template>
