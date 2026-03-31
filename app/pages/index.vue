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
        <div v-if="nextEvent" class="hero-meta-grid">
          <div>
            <p class="hero-meta-grid__label">開催日時</p>
            <p>{{ nextEvent.date }} {{ nextEvent.time }}</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">発表者</p>
            <p>{{ nextEvent.presenter }}</p>
          </div>
          <div>
            <p class="hero-meta-grid__label">テーマ</p>
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
          class="button button--hero-primary"
        >
          会議リンクを開く
        </a>
        <NuxtLink to="/minutes" class="button button--hero-secondary">
          議事録を見る
        </NuxtLink>
      </template>
    </PageHero>

    <section class="home-grid">
      <NuxtLink to="/minutes" class="panel panel--interactive home-card">
        <p class="eyebrow">Minutes</p>
        <h2 class="panel__title">議事録</h2>
        <p class="section-header__description">過去回の内容を時系列で確認できます。</p>
      </NuxtLink>
      <NuxtLink to="/schedule" class="panel panel--interactive home-card">
        <p class="eyebrow">Schedule</p>
        <h2 class="panel__title">スケジュール</h2>
        <p class="section-header__description">今後の開催予定と参加リンクをまとめています。</p>
      </NuxtLink>
      <NuxtLink to="/survey" class="panel panel--interactive home-card">
        <p class="eyebrow">Survey</p>
        <h2 class="panel__title">アンケート</h2>
        <p class="section-header__description">勉強会フィードバックや次回テーマ希望を受け付けます。</p>
      </NuxtLink>
      <NuxtLink to="/resources" class="panel panel--interactive home-card">
        <p class="eyebrow">Resources</p>
        <h2 class="panel__title">資料共有</h2>
        <p class="section-header__description">発表資料と参考リンクを整理して掲載します。</p>
      </NuxtLink>
    </section>

    <section v-if="recentMinutes.length" class="stack-md">
      <SectionHeader
        eyebrow="Recent Minutes"
        title="最近の議事録"
        description="直近の開催内容をすぐに振り返れます。"
      >
        <template #action>
          <NuxtLink to="/minutes" class="button button--secondary">
            すべて見る
          </NuxtLink>
        </template>
      </SectionHeader>

      <div class="home-grid home-grid--three">
        <NuxtLink
          v-for="minutes in recentMinutes"
          :key="minutes.slug"
          :to="`/minutes/${minutes.slug}`"
          class="panel panel--interactive"
        >
          <p class="meta-text">{{ minutes.date }}</p>
          <h3 class="panel__title">{{ minutes.title }}</h3>
          <div class="tag-list">
            <span v-for="topic in minutes.topics" :key="topic" class="tag tag--accent">
              {{ topic }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </PageContainer>
</template>
