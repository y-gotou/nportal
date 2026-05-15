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
    <div class="mb-4 flex flex-wrap gap-3">
      <NuxtLink to="/minutes" :class="secondaryButtonClass">
        <IconArrowLeft />
        一覧へ戻る
      </NuxtLink>
    </div>

    <div class="mb-6">
      <h1 class="text-pretty text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {{ minutes.title }}
      </h1>
      <dl class="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm text-muted">
        <dt class="text-xs font-semibold tracking-[0.14em] text-muted">開催日</dt>
        <dd>{{ formatDisplayDate(minutes.date) }}</dd>
        <dt class="text-xs font-semibold tracking-[0.14em] text-muted">発表者</dt>
        <dd>{{ minutes.attendees.join("、") }}</dd>
        <dt class="text-xs font-semibold tracking-[0.14em] text-muted">トピック</dt>
        <dd>{{ minutes.topics.join("、") }}</dd>
      </dl>
    </div>

    <article
      class="prose max-w-none rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8"
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
          class="rounded-xl border border-border bg-surface p-5 shadow-sm transition-[border-color,box-shadow] hover:border-blue-500/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <p class="text-sm text-muted">{{ resource.type }}</p>
          <h2 class="mt-2 text-pretty text-lg font-semibold tracking-tight text-foreground">
            {{ resource.title }}
          </h2>
        </a>
      </div>
    </section>
  </PageContainer>
</template>
