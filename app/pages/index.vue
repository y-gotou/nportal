<script setup lang="ts">
import type { SurveysResponse } from "~~/types/portal";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  getNextEvent,
  getRecentMinutes,
  getRecentResources,
  portalDescription,
} from "~~/utils/content";
import {
  interactiveCardClass,
  primaryButtonClass,
  secondaryButtonClass,
  topicTagClass,
} from "~/utils/ui";

const nextEvent = getNextEvent();
const recentMinutes = getRecentMinutes();
const recentResources = getRecentResources();

const { data } = await useFetch<SurveysResponse>("/api/surveys", {
  default: () => ({ surveys: [] }),
});

const activeSurveys = computed(() =>
  (data.value?.surveys ?? [])
    .filter((survey) => survey.isActive)
    .slice(0, 2),
);

useSeoMeta({
  title: "ホーム",
  description: portalDescription,
});
</script>

<template>
  <PageContainer size="wide">
    <PageHero
      :eyebrow="nextEvent ? '次回の会議' : undefined"
      :title="nextEvent ? nextEvent.title : '社内AI勉強会の情報をひとつに集約'"
      :description="
        nextEvent
          ? '次回の開催情報と、直近の確認事項をまとめています。'
          : portalDescription
      "
    >
      <template #meta>
        <div
          v-if="nextEvent"
          class="grid gap-4 text-sm md:grid-cols-3 md:text-base"
        >
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold tracking-[0.16em] text-white/60">
              開催日時
            </p>
            <p>{{ formatDisplayDateTime(nextEvent.date, nextEvent.time) }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold tracking-[0.16em] text-white/60">
              発表者
            </p>
            <p>{{ nextEvent.presenter }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p class="mb-1 text-xs font-semibold tracking-[0.16em] text-white/60">
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
          :class="primaryButtonClass"
        >
          会議に参加する
        </a>
        <NuxtLink
          to="/schedule"
          :class="`${secondaryButtonClass} border-white/20 text-white hover:bg-white/10 hover:text-white`"
        >
          予定一覧を見る
        </NuxtLink>
      </template>
    </PageHero>

    <section v-if="activeSurveys.length" class="space-y-4">
      <SectionHeader
        title="次にやること"
        description="回答受付中のアンケートです。必要なものから回答してください。"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="survey in activeSurveys"
          :key="survey.id"
          :class="`${interactiveCardClass} flex h-full flex-col p-5`"
        >
          <div class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
              <h2 class="text-pretty text-xl font-semibold tracking-tight text-slate-900">
                {{ survey.title }}
              </h2>
              <p class="text-sm leading-6 text-slate-500">
                {{ survey.description }}
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
              受付中
            </span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
            <span class="rounded-full bg-slate-100 px-3 py-1">
              設問数 {{ survey.questions.length }}問
            </span>
            <span
              v-if="typeof survey.responseCount === 'number'"
              class="rounded-full bg-slate-100 px-3 py-1"
            >
              回答 {{ survey.responseCount }}件
            </span>
          </div>
          <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink :to="`/survey/${survey.id}`" :class="primaryButtonClass">
              回答する
            </NuxtLink>
            <NuxtLink
              v-if="(survey.responseCount ?? 0) > 0"
              :to="`/survey/${survey.id}/results`"
              :class="secondaryButtonClass"
            >
              集計を見る
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <section v-if="recentMinutes.length" class="mt-10 space-y-4">
      <SectionHeader
        title="最近の議事録"
        description="直近の開催内容をすぐに振り返れます。"
      >
        <template #action>
          <NuxtLink to="/minutes" :class="secondaryButtonClass">
            すべて見る
          </NuxtLink>
        </template>
      </SectionHeader>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="minutes in recentMinutes"
          :key="minutes.slug"
          :to="`/minutes/${minutes.slug}`"
          :class="`${interactiveCardClass} block p-5`"
        >
          <p class="text-sm text-slate-500">{{ formatDisplayDate(minutes.date) }}</p>
          <h3 class="mt-2 text-pretty text-lg font-semibold tracking-tight text-slate-900">
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

    <section v-if="recentResources.length" class="mt-10 space-y-4">
      <SectionHeader
        title="最近の資料"
        description="直近で共有された資料と参考リンクです。"
      >
        <template #action>
          <NuxtLink to="/resources" :class="secondaryButtonClass">
            資料一覧へ
          </NuxtLink>
        </template>
      </SectionHeader>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="resource in recentResources"
          :key="resource.id"
          :class="`${interactiveCardClass} flex h-full flex-col p-5`"
        >
          <div class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-slate-500">{{ formatDisplayDate(resource.date) }}</p>
              <h3 class="mt-2 text-pretty text-lg font-semibold tracking-tight text-slate-900">
                {{ resource.title }}
              </h3>
            </div>
            <span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
              {{ resource.type }}
            </span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="tag in resource.tags"
              :key="tag"
              :class="topicTagClass"
            >
              {{ tag }}
            </span>
          </div>
          <div class="mt-5 flex flex-wrap gap-3">
            <a
              :href="resource.url"
              target="_blank"
              rel="noreferrer"
              :class="primaryButtonClass"
            >
              資料を開く
            </a>
            <NuxtLink
              v-if="resource.relatedMinutesSlug"
              :to="`/minutes/${resource.relatedMinutesSlug}`"
              :class="secondaryButtonClass"
            >
              関連議事録
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>
  </PageContainer>
</template>
