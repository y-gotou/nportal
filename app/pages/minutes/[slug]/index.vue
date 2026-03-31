<script setup lang="ts">
import { getMinutes } from "~/utils/content";

const route = useRoute();
const slug = String(route.params.slug);
const minutes = getMinutes(slug);

if (!minutes) {
  throw createError({
    statusCode: 404,
    statusMessage: "Minutes not found",
  });
}

useSeoMeta({
  title: minutes.title,
  description: `${minutes.date} 開催分の議事録です。`,
});
</script>

<template>
  <PageContainer size="medium">
    <PageHero eyebrow="Minutes Detail" :title="minutes.title">
      <template #meta>
        <div class="grid gap-4 text-sm md:grid-cols-3 md:text-base">
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              開催日
            </p>
            <p>{{ minutes.date }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              参加者
            </p>
            <p>{{ minutes.attendees.join("、") }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              トピック
            </p>
            <p>{{ minutes.topics.join("、") }}</p>
          </div>
        </div>
      </template>
      <template #actions>
        <NuxtLink
          to="/minutes"
          class="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          一覧へ戻る
        </NuxtLink>
      </template>
    </PageHero>

    <article
      class="prose max-w-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      v-html="minutes.contentHtml"
    />
  </PageContainer>
</template>
