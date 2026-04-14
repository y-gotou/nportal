<script setup lang="ts">
import type { MinutesListResponse, ScheduleListResponse, ResourcesListResponse, SurveysResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const [
  { data: minutesData },
  { data: scheduleData },
  { data: resourcesData },
  { data: surveysData },
] = await Promise.all([
  useFetch<MinutesListResponse>("/api/minutes", { default: () => ({ minutes: [] }) }),
  useFetch<ScheduleListResponse>("/api/schedule", { default: () => ({ schedule: [] }) }),
  useFetch<ResourcesListResponse>("/api/resources", { default: () => ({ resources: [] }) }),
  useFetch<SurveysResponse>("/api/surveys", { default: () => ({ surveys: [] }) }),
]);

const stats = computed(() => [
  {
    label: "議事録",
    count: minutesData.value?.minutes.length ?? 0,
    to: "/admin/minutes",
    newTo: "/admin/minutes/new",
  },
  {
    label: "スケジュール",
    count: scheduleData.value?.schedule.length ?? 0,
    to: "/admin/schedule",
    newTo: "/admin/schedule/new",
  },
  {
    label: "アンケート",
    count: surveysData.value?.surveys.length ?? 0,
    to: "/admin/surveys",
    newTo: "/admin/surveys/new",
  },
  {
    label: "資料",
    count: resourcesData.value?.resources.length ?? 0,
    to: "/admin/resources",
    newTo: "/admin/resources/new",
  },
]);

useSeoMeta({ title: "ダッシュボード" });
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold tracking-tight text-slate-900">ダッシュボード</h1>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <p class="text-sm font-medium text-slate-500">{{ stat.label }}</p>
        <p class="mt-1 text-3xl font-bold tracking-tight text-slate-900">{{ stat.count }}</p>
        <div class="mt-4 flex gap-2">
          <NuxtLink
            :to="stat.to"
            class="text-xs font-medium text-blue-600 hover:underline"
          >
            一覧
          </NuxtLink>
          <span class="text-slate-300">|</span>
          <NuxtLink
            :to="stat.newTo"
            class="text-xs font-medium text-blue-600 hover:underline"
          >
            新規追加
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
