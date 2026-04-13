<script setup lang="ts">
import {
  getNextEvent,
  getRecentMinutes,
  portalDescription,
} from "~~/utils/content";
import { interactiveCardClass, secondaryButtonClass, topicTagClass } from "~/utils/ui";

const homeSections = [
  {
    to: "/minutes",
    title: "議事録",
    description: "過去回の内容を時系列で確認できます。",
    iconPath:
      "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  {
    to: "/schedule",
    title: "スケジュール",
    description: "今後の開催予定と参加リンクをまとめています。",
    iconPath:
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  },
  {
    to: "/survey",
    title: "アンケート",
    description: "勉強会フィードバックや次回テーマ希望を受け付けます。",
    iconPath:
      "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  },
  {
    to: "/resources",
    title: "資料共有",
    description: "発表資料と参考リンクを整理して掲載します。",
    iconPath:
      "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  },
] as const;

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
          v-if="nextEvent?.meetingUrl"
          :href="nextEvent.meetingUrl"
          target="_blank"
          rel="noreferrer"
          class="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#2d3748] transition-colors hover:bg-slate-100"
        >
          会議リンクを開く
        </a>
      </template>
    </PageHero>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="section in homeSections"
        :key="section.to"
        :to="section.to"
        :class="`${interactiveCardClass} group flex min-h-[196px] flex-col p-6`"
      >
        <div
          class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 transition-colors group-hover:bg-blue-50"
        >
          <svg
            class="h-10 w-10 text-slate-500 transition-colors group-hover:text-blue-600"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              :d="section.iconPath"
            />
          </svg>
        </div>
        <div class="mt-auto space-y-2">
          <h2 class="text-xl font-semibold tracking-tight text-slate-900">
            {{ section.title }}
          </h2>
          <p class="text-sm leading-6 text-slate-500">
            {{ section.description }}
          </p>
        </div>
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
            :class="secondaryButtonClass"
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
              :class="topicTagClass"
            >
              {{ topic }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </PageContainer>
</template>
