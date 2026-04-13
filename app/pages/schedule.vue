<script setup lang="ts">
import {
  formatDisplayDateTime,
  getTodayDate,
  splitScheduleByDate,
} from "~~/utils/content";
import { primaryButtonClass, secondaryButtonClass, topicTagClass } from "~/utils/ui";

const { upcoming, past } = splitScheduleByDate(getTodayDate());

useSeoMeta({
  title: "スケジュール",
  description: "今後の勉強会予定を確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <section v-if="upcoming.length" class="space-y-4">
      <SectionHeader
        title="今後の予定"
        description="参加リンクとテーマをまとめています。"
      />

      <div class="space-y-3">
        <article
          v-for="item in upcoming"
          :key="item.id"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-slate-500">
                {{ formatDisplayDateTime(item.date, item.time) }}<span v-if="item.location"> ・ {{ item.location }}</span>
              </p>
              <h2 class="text-pretty text-xl font-semibold tracking-tight text-slate-900">
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
              <NuxtLink to="/survey" :class="secondaryButtonClass">
                アンケートを見る
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="past.length" class="mt-10 space-y-4">
      <SectionHeader
        title="開催済みの回"
        description="議事録や関連導線を確認できます。"
      />

      <div class="space-y-3">
        <article
          v-for="item in past"
          :key="item.id"
          class="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-slate-500">
                {{ formatDisplayDateTime(item.date, item.time) }}<span v-if="item.location"> ・ {{ item.location }}</span>
              </p>
              <h2 class="text-pretty text-lg font-semibold tracking-tight text-slate-900">
                {{ item.title }}
              </h2>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="topic in item.topics"
                  :key="topic"
                  class="rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-600"
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
            </div>
          </div>
        </article>
      </div>
    </section>

    <p
      v-if="!upcoming.length && !past.length"
      class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      スケジュールはまだ登録されていません。
    </p>
  </PageContainer>
</template>
