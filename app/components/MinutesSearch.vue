<script setup lang="ts">
import type { MinutesMeta } from "~~/types/portal";

const props = defineProps<{
  minutes: MinutesMeta[];
}>();

const search = ref("");

const filteredMinutes = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) {
    return props.minutes;
  }

  return props.minutes.filter(
    (minutes) =>
      minutes.title.toLowerCase().includes(keyword) ||
      minutes.topics.some((topic) => topic.toLowerCase().includes(keyword)),
  );
});
</script>

<template>
  <div class="stack-lg">
    <div class="panel panel--soft">
      <label for="minutes-search" class="form-label">キーワード検索</label>
      <input
        id="minutes-search"
        v-model="search"
        type="search"
        class="form-input"
        placeholder="タイトルやトピックで検索"
      >
    </div>

    <div v-if="filteredMinutes.length" class="stack-md">
      <NuxtLink
        v-for="minutes in filteredMinutes"
        :key="minutes.slug"
        :to="`/minutes/${minutes.slug}`"
        class="panel panel--interactive"
      >
        <div class="panel__row">
          <h3 class="panel__title">{{ minutes.title }}</h3>
          <span class="meta-text">{{ minutes.date }}</span>
        </div>
        <div class="tag-list">
          <span v-for="topic in minutes.topics" :key="topic" class="tag tag--accent">
            {{ topic }}
          </span>
        </div>
        <p class="meta-text">参加者: {{ minutes.attendees.join("、") }}</p>
      </NuxtLink>
    </div>

    <p v-else class="empty-state">
      該当する議事録が見つかりません。
    </p>
  </div>
</template>
