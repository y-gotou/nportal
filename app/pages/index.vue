<script setup lang="ts">
import type {
  MinutesListResponse,
  ResourcesListResponse,
  ScheduleListResponse,
  SurveysResponse,
} from "~~/types/portal";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  getTodayDate,
  portalDescription,
} from "~~/utils/content";
import {
  interactiveCardClass,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceCardClass,
  topicTagClass,
} from "~/utils/ui";

const today = getTodayDate();

const [
  { data: scheduleData },
  { data: minutesData },
  { data: resourcesData },
  { data: surveysData },
] = await Promise.all([
  useFetch<ScheduleListResponse>("/api/schedule", { default: () => ({ schedule: [] }) }),
  useFetch<MinutesListResponse>("/api/minutes", { default: () => ({ minutes: [] }) }),
  useFetch<ResourcesListResponse>("/api/resources", { default: () => ({ resources: [] }) }),
  useFetch<SurveysResponse>("/api/surveys", { default: () => ({ surveys: [] }) }),
]);

const nextEvent = computed(() =>
  (scheduleData.value?.schedule ?? []).find((item) => item.date >= today) ?? null,
);
const recentMinutes = computed(() => (minutesData.value?.minutes ?? []).slice(0, 3));
const recentResources = computed(() => (resourcesData.value?.resources ?? []).slice(0, 3));
const activeSurveys = computed(() =>
  (surveysData.value?.surveys ?? [])
    .filter((survey) => survey.status === "active" && !survey.hasResponded)
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
      v-if="nextEvent"
      eyebrow="次回の会議"
      :title="nextEvent.title"
    >
      <template #meta>
        <dl
          class="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm text-slate-200"
        >
          <dt class="text-xs font-semibold tracking-[0.14em] text-white/50">開催日時</dt>
          <dd>{{ formatDisplayDateTime(nextEvent.date, nextEvent.time) }}</dd>
          <template v-if="nextEvent.location">
            <dt class="text-xs font-semibold tracking-[0.14em] text-white/50">開催場所</dt>
            <dd>{{ nextEvent.location }}</dd>
          </template>
          <dt class="text-xs font-semibold tracking-[0.14em] text-white/50">テーマ</dt>
          <dd>{{ nextEvent.topics.join("、") }}</dd>
        </dl>
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
          :class="`${secondaryButtonClass} !bg-transparent border-white/20 text-white hover:!bg-white/10 hover:text-white`"
        >
          予定一覧を見る
        </NuxtLink>
      </template>
    </PageHero>

    <section v-if="activeSurveys.length" class="space-y-4">
      <SectionHeader
        title="受付中のアンケート"
      />

      <div class="space-y-3">
        <article
          v-for="survey in activeSurveys"
          :key="survey.id"
          :class="surfaceCardClass"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <div class="flex min-w-0 flex-wrap items-start gap-2">
                <h2 class="min-w-0 text-pretty text-xl font-semibold tracking-tight text-foreground">
                  {{ survey.title }}
                </h2>
                <span class="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                  受付中
                </span>
              </div>
              <p class="text-sm leading-6 text-muted">{{ survey.description }}</p>
              <div class="flex flex-wrap gap-2 text-sm text-muted">
                <span class="rounded-full bg-surface-hover px-3 py-1">設問数 {{ survey.questions.length }}問</span>
                <span class="rounded-full bg-surface-hover px-3 py-1">
                  回答者 {{ survey.responseCount ?? 0 }}人
                </span>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <NuxtLink :to="`/survey/${survey.id}`" :class="primaryButtonClass">
                回答する
              </NuxtLink>
              <NuxtLink
                v-if="(survey.responseCount ?? 0) > 0"
                :to="`/survey/${survey.id}/results`"
                :class="secondaryButtonClass"
              >
                結果を見る
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section
      v-if="recentMinutes.length"
      class="space-y-4"
      :class="{ 'mt-10': nextEvent || activeSurveys.length }"
    >
      <SectionHeader
        title="最近の議事録"
      >
        <template #action>
          <NuxtLink to="/minutes" :class="secondaryButtonClass">
            すべて見る
          </NuxtLink>
        </template>
      </SectionHeader>

      <div class="space-y-3">
        <NuxtLink
          v-for="minutes in recentMinutes"
          :key="minutes.slug"
          :to="`/minutes/${minutes.slug}`"
          :class="`${interactiveCardClass} block p-5`"
        >
          <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <h3 class="text-pretty text-lg font-semibold tracking-tight text-foreground">
              {{ minutes.title }}
            </h3>
            <p class="shrink-0 text-sm text-muted">{{ formatDisplayDate(minutes.date) }}</p>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
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
      >
        <template #action>
          <NuxtLink to="/resources" :class="secondaryButtonClass">
            資料一覧へ
          </NuxtLink>
        </template>
      </SectionHeader>

      <div class="space-y-3">
        <article
          v-for="resource in recentResources"
          :key="resource.id"
          :class="`${interactiveCardClass} p-5`"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-muted">
                {{ formatDisplayDate(resource.date) }}
                <span class="ml-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted">{{ resource.type }}</span>
              </p>
              <h3 class="text-pretty text-lg font-semibold tracking-tight text-foreground">
                {{ resource.title }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in resource.tags"
                  :key="tag"
                  :class="topicTagClass"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <a
                :href="resource.url"
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
          </div>
        </article>
      </div>
    </section>
  </PageContainer>
</template>
