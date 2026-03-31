<script setup lang="ts">
import { getNextEvent, getRecentMinutes, portalDescription } from "~/utils/content";

const nextEvent = getNextEvent();
const recentMinutes = getRecentMinutes();

useSeoMeta({
  title: "ホーム",
  description: portalDescription,
});
</script>

<template>
  <PageContainer size="wide">
    <PageHero
      eyebrow="社内ポータル"
      :title="nextEvent ? nextEvent.title : 'AI勉強会の最新情報をひとつに'"
      :description="
        nextEvent
          ? '次回開催の概要と、議事録・資料・アンケートへの導線をまとめています。'
          : portalDescription
      "
    >
      <template #meta>
        <div
          v-if="nextEvent"
          class="grid gap-4 text-sm md:grid-cols-3 md:text-base"
        >
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              開催日時
            </p>
            <p>{{ nextEvent.date }} {{ nextEvent.time }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              発表者
            </p>
            <p>{{ nextEvent.presenter }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              テーマ
            </p>
            <p>{{ nextEvent.topics.join("、") }}</p>
          </div>
        </div>
      </template>
      <template #actions>
        <a
          v-if="nextEvent"
          :href="nextEvent.meetingUrl"
          target="_blank"
          rel="noreferrer"
          class="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#2d3748] transition-colors hover:bg-slate-100"
        >
          会議リンクを開く
        </a>
        <NuxtLink
          to="/minutes"
          class="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          議事録を見る
        </NuxtLink>
      </template>
    </PageHero>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        to="/minutes"
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Minutes</p>
        <h2 class="mt-3 text-xl font-semibold tracking-tight text-slate-900">議事録</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">過去回の内容を時系列で確認できます。</p>
      </NuxtLink>
      <NuxtLink
        to="/schedule"
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Schedule</p>
        <h2 class="mt-3 text-xl font-semibold tracking-tight text-slate-900">スケジュール</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          今後の開催予定と参加リンクをまとめています。
        </p>
      </NuxtLink>
      <NuxtLink
        to="/survey"
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Survey</p>
        <h2 class="mt-3 text-xl font-semibold tracking-tight text-slate-900">アンケート</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          勉強会フィードバックや次回テーマ希望を受け付けます。
        </p>
      </NuxtLink>
      <NuxtLink
        to="/resources"
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Resources</p>
        <h2 class="mt-3 text-xl font-semibold tracking-tight text-slate-900">資料共有</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          発表資料と参考リンクを整理して掲載します。
        </p>
      </NuxtLink>
    </section>

    <section v-if="recentMinutes.length" class="mt-10 space-y-4">
      <SectionHeader
        eyebrow="Recent Minutes"
        title="最近の議事録"
        description="直近の開催内容をすぐに振り返れます。"
      >
        <template #action>
          <NuxtLink
            to="/minutes"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            すべて見る
          </NuxtLink>
        </template>
      </SectionHeader>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="minutes in recentMinutes"
          :key="minutes.slug"
          :to="`/minutes/${minutes.slug}`"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
        >
          <p class="text-sm text-slate-500">{{ minutes.date }}</p>
          <h3 class="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            {{ minutes.title }}
          </h3>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="topic in minutes.topics"
              :key="topic"
              class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600"
            >
              {{ topic }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </PageContainer>
</template>
