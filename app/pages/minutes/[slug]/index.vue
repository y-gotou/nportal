<script setup lang="ts">
import {
  formatDisplayDate,
  getMinutes,
  getResourcesForMinutes,
} from "~~/utils/content";
import { secondaryButtonClass } from "~/utils/ui";

const route = useRoute();
const slug = String(route.params.slug);
const minutes = getMinutes(slug);
const relatedResources = getResourcesForMinutes(slug);

if (!minutes) {
  throw createError({
    statusCode: 404,
    statusMessage: "Minutes not found",
  });
}

useSeoMeta({
  title: minutes.title,
  description: `${formatDisplayDate(minutes.date)} 開催分の議事録です。`,
});
</script>

<template>
  <PageContainer size="medium">
    <PageHero eyebrow="議事録" :title="minutes.title">
      <template #meta>
        <div class="grid gap-4 text-sm md:grid-cols-3 md:text-base">
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold tracking-[0.16em] text-white/60">
              開催日
            </p>
            <p>{{ formatDisplayDate(minutes.date) }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold tracking-[0.16em] text-white/60">
              参加者
            </p>
            <p>{{ minutes.attendees.join("、") }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold tracking-[0.16em] text-white/60">
              トピック
            </p>
            <p>{{ minutes.topics.join("、") }}</p>
          </div>
        </div>
      </template>
      <template #actions>
        <NuxtLink
          to="/minutes"
          :class="`${secondaryButtonClass} border-white/20 px-5 font-semibold text-white hover:bg-white/10 hover:text-white`"
        >
          一覧へ戻る
        </NuxtLink>
      </template>
    </PageHero>

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
