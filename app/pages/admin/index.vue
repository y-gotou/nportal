<script setup lang="ts">
import type { MinutesListResponse, ReportsListResponse, ResourcesListResponse, ScheduleListResponse, SpeakersListResponse, SurveysResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const [
  { data: minutesData },
  { data: scheduleData },
  { data: resourcesData },
  { data: surveysData },
  { data: reportsData },
  { data: speakersData },
] = await Promise.all([
  useFetch<MinutesListResponse>("/api/minutes", { default: () => ({ minutes: [] }) }),
  useFetch<ScheduleListResponse>("/api/schedule", { default: () => ({ schedule: [] }) }),
  useFetch<ResourcesListResponse>("/api/resources", { default: () => ({ resources: [] }) }),
  useFetch<SurveysResponse>("/api/surveys", { default: () => ({ surveys: [] }) }),
  useFetch<ReportsListResponse>("/api/admin/reports", { default: () => ({ reports: [] }) }),
  useFetch<SpeakersListResponse>("/api/speakers", { default: () => ({ applications: [] }) }),
]);

const pendingSpeakers = computed(() =>
  (speakersData.value?.applications ?? []).filter((a) => a.status === "pending").length,
);

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
  {
    label: "不具合・要望",
    count: reportsData.value?.reports.length ?? 0,
    to: "/admin/reports",
    newTo: null,
  },
  {
    label: "発表募集",
    count: speakersData.value?.applications.length ?? 0,
    subLabel: pendingSpeakers.value > 0 ? `応募中 ${pendingSpeakers.value}件` : undefined,
    to: "/admin/speakers",
    newTo: null,
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
        <p v-if="stat.subLabel" class="text-xs text-amber-600">{{ stat.subLabel }}</p>
        <div class="mt-4 flex gap-2">
          <NuxtLink
            :to="stat.to"
            class="text-xs font-medium text-blue-600 hover:underline"
          >
            一覧
          </NuxtLink>
          <template v-if="stat.newTo">
            <span class="text-slate-300">|</span>
            <NuxtLink
              :to="stat.newTo"
              class="text-xs font-medium text-blue-600 hover:underline"
            >
              新規追加
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
