<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { secondaryButtonClass } from "~/utils/ui";
import type { MinutesDetailResponse, ResourcesListResponse } from "~~/types/portal";

const route = useRoute();
const slug = String(route.params.slug);

const [{ data, error }, { data: resourcesData }] = await Promise.all([
  useFetch<MinutesDetailResponse>("/api/minute", { query: { slug } }),
  useFetch<ResourcesListResponse>("/api/resources", { query: { minutesSlug: slug } }),
]);

if (error.value || !data.value?.minutes) {
  throw createError({ statusCode: 404, statusMessage: "Minutes not found" });
}

const minutes = computed(() => data.value!.minutes);
const relatedResources = computed(() => resourcesData.value?.resources ?? []);

useSeoMeta({
  title: () => minutes.value.title,
  description: () => `${formatDisplayDate(minutes.value.date)} 開催分の議事録です。`,
});
</script>

<template>
  <PageContainer size="wide">
    <div class="mb-6">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs font-semibold tracking-[0.16em] text-slate-400">議事録</span>
        <NuxtLink to="/minutes" :class="secondaryButtonClass">一覧へ戻る</NuxtLink>
      </div>
      <h1 class="text-pretty text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
        {{ minutes.title }}
      </h1>
      <dl class="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm text-slate-500">
        <dt class="text-xs font-semibold tracking-[0.14em] text-slate-400">開催日</dt>
        <dd>{{ formatDisplayDate(minutes.date) }}</dd>
        <dt class="text-xs font-semibold tracking-[0.14em] text-slate-400">参加者</dt>
        <dd>{{ minutes.attendees.join("、") }}</dd>
        <dt class="text-xs font-semibold tracking-[0.14em] text-slate-400">トピック</dt>
        <dd>{{ minutes.topics.join("、") }}</dd>
      </dl>
    </div>

    <article
      class="prose max-w-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      v-html="minutes.contentHtml"
    />

    <section v-if="relatedResources.length" class="mt-8 space-y-4">
      <SectionHeader
        title="関連資料"
        description="この回で参照した資料と参考リンクです。"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <a
          v-for="resource in relatedResources"
          :key="resource.id"
          :href="resource.url"
          target="_blank"
          rel="noreferrer"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-blue-500/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <p class="text-sm text-slate-500">{{ resource.type }}</p>
          <h2 class="mt-2 text-pretty text-lg font-semibold tracking-tight text-slate-900">
            {{ resource.title }}
          </h2>
        </a>
      </div>
    </section>
  </PageContainer>
</template>
