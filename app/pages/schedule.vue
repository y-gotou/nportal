<script setup lang="ts">
import { getSchedule } from "~/utils/content";

const today = new Date().toISOString().slice(0, 10);
const schedule = getSchedule();
const upcoming = computed(() => schedule.filter((item) => item.date >= today));
const past = computed(() =>
  schedule.filter((item) => item.date < today).sort((a, b) => b.date.localeCompare(a.date)),
);

useSeoMeta({
  title: "スケジュール",
  description: "今後の勉強会予定を確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <section v-if="upcoming.length" class="stack-md section-block">
      <SectionHeader
        eyebrow="Upcoming"
        title="今後の予定"
        description="直近の開催情報と参加リンクです。"
      />

      <article v-for="item in upcoming" :key="item.id" class="panel panel--interactive stack-sm">
        <div class="panel__row">
          <div class="stack-xs">
            <h3 class="panel__title">{{ item.title }}</h3>
            <p class="meta-text">{{ item.date }} {{ item.time }} / 発表者: {{ item.presenter }}</p>
          </div>
          <a :href="item.meetingUrl" target="_blank" rel="noreferrer" class="button button--primary">
            参加リンク
          </a>
        </div>
        <div class="tag-list">
          <span v-for="topic in item.topics" :key="topic" class="tag tag--accent">
            {{ topic }}
          </span>
        </div>
      </article>
    </section>

    <section v-if="past.length" class="stack-md">
      <SectionHeader
        eyebrow="Archive"
        title="過去の開催"
        description="過去回のテーマをアーカイブしています。"
      />

      <article v-for="item in past" :key="item.id" class="panel panel--soft stack-xs">
        <div class="panel__row">
          <h3 class="panel__title">{{ item.title }}</h3>
          <p class="meta-text">{{ item.date }} {{ item.time }}</p>
        </div>
        <p class="meta-text">発表者: {{ item.presenter }}</p>
        <div class="tag-list">
          <span v-for="topic in item.topics" :key="topic" class="tag tag--muted">
            {{ topic }}
          </span>
        </div>
      </article>
    </section>

    <p v-if="!schedule.length" class="empty-state">
      スケジュールはまだ登録されていません。
    </p>
  </PageContainer>
</template>
