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
        <div class="hero-meta-grid">
          <div>
            <p class="hero-meta-grid__label">開催日</p>
            <p>{{ minutes.date }}</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">参加者</p>
            <p>{{ minutes.attendees.join("、") }}</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">トピック</p>
            <p>{{ minutes.topics.join("、") }}</p>
          </div>
        </div>
      </template>
      <template #actions>
        <NuxtLink to="/minutes" class="button button--hero-secondary">
          一覧へ戻る
        </NuxtLink>
      </template>
    </PageHero>

    <article class="panel minutes-content" v-html="minutes.contentHtml" />
  </PageContainer>
</template>
