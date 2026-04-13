<script setup lang="ts">
import { getSchedule, getTodayDate, splitScheduleByDate } from "~~/utils/content";
import { interactiveCardClass, primaryButtonClass, topicTagClass } from "~/utils/ui";

const schedule = getSchedule();
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
        eyebrow="Upcoming"
        title="今後の予定"
        description="直近の開催情報を確認できます。"
      />

      <article
        v-for="item in upcoming"
        :key="item.id"
        :class="`${interactiveCardClass} space-y-4 p-6`"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-1">
            <h3 class="text-xl font-semibold tracking-tight text-slate-900">{{ item.title }}</h3>
            <p class="text-sm leading-6 text-slate-500">
              {{ item.date }} {{ item.time }} / 発表者: {{ item.presenter }}
            </p>
          </div>
          <a
            v-if="item.meetingUrl"
            :href="item.meetingUrl"
            target="_blank"
            rel="noreferrer"
            :class="`${primaryButtonClass} shrink-0`"
          >
            参加リンク
          </a>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="topic in item.topics"
            :key="topic"
            :class="topicTagClass"
          >
            {{ topic }}
          </span>
        </div>
      </article>
    </section>

    <section v-if="past.length" class="mt-10 space-y-4">
      <SectionHeader
        eyebrow="Archive"
        title="過去の開催"
        description="過去回のテーマをアーカイブしています。"
      />

      <article
        v-for="item in past"
        :key="item.id"
        class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 class="text-lg font-semibold tracking-tight text-slate-900">{{ item.title }}</h3>
          <p class="text-sm text-slate-500">{{ item.date }} {{ item.time }}</p>
        </div>
        <p class="text-sm text-slate-500">発表者: {{ item.presenter }}</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="topic in item.topics"
            :key="topic"
            class="rounded bg-slate-200 px-2.5 py-0.5 text-xs text-slate-500"
          >
            {{ topic }}
          </span>
        </div>
      </article>
    </section>

    <p
      v-if="!schedule.length"
      class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      スケジュールはまだ登録されていません。
    </p>
  </PageContainer>
</template>
