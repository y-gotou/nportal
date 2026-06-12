<script setup lang="ts">
import {
  formatDisplayDateTime,
  getTodayDate,
} from "~~/utils/content";
import { primaryButtonClass, secondaryButtonClass, topicTagClass } from "~/utils/ui";
import type { ScheduleListResponse } from "~~/types/portal";

const { data } = await useFetch<ScheduleListResponse>("/api/schedule", {
  default: () => ({ schedule: [] }),
});

const today = getTodayDate();

const upcoming = computed(() =>
  (data.value?.schedule ?? []).filter((item) => item.date >= today),
);

const past = computed(() =>
  (data.value?.schedule ?? [])
    .filter((item) => item.date < today)
    .slice()
    .reverse(),
);

useSeoMeta({
  title: "スケジュール",
  description: "今後の勉強会予定を確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <section v-if="upcoming.length" class="space-y-4">
      <SectionHeader title="今後の予定" />

      <div class="space-y-3">
        <article
          v-for="item in upcoming"
          :key="item.id"
          class="rounded-xl border border-border bg-surface p-5 shadow-sm"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-muted">
                {{ formatDisplayDateTime(item.date, item.time) }}<span v-if="item.location"> ・ {{ item.location }}</span>
              </p>
              <h2 class="text-pretty text-xl font-semibold tracking-tight text-foreground">
                {{ item.title }}
              </h2>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="topic in item.topics"
                  :key="topic"
                  :class="topicTagClass"
                >
                  {{ topic }}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <a
                v-if="item.meetingUrl"
                :href="item.meetingUrl"
                target="_blank"
                rel="noreferrer"
                :class="primaryButtonClass"
              >
                会議に参加する
              </a>
              <NuxtLink
                :to="`/chat/${item.id}`"
                :class="secondaryButtonClass"
              >
                チャット
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section
      v-if="past.length"
      class="space-y-4"
      :class="{ 'mt-10': upcoming.length }"
    >
      <SectionHeader title="開催済みの回" />

      <div class="space-y-3">
        <article
          v-for="item in past"
          :key="item.id"
          class="rounded-xl border border-border bg-background p-5 shadow-sm"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-muted">
                {{ formatDisplayDateTime(item.date, item.time) }}<span v-if="item.location"> ・ {{ item.location }}</span>
              </p>
              <h2 class="text-pretty text-lg font-semibold tracking-tight text-foreground">
                {{ item.title }}
              </h2>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="topic in item.topics"
                  :key="topic"
                  class="rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted"
                >
                  {{ topic }}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <NuxtLink
                v-if="item.minutesSlug"
                :to="`/minutes/${item.minutesSlug}`"
                :class="secondaryButtonClass"
              >
                議事録を見る
              </NuxtLink>
              <NuxtLink
                :to="`/chat/${item.id}`"
                :class="secondaryButtonClass"
              >
                チャット
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </section>

    <p
      v-if="!upcoming.length && !past.length"
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      スケジュールはまだ登録されていません。
    </p>
  </PageContainer>
</template>
