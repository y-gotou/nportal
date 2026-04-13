<script setup lang="ts">
import type { MinutesMeta } from "~~/types/portal";
import { interactiveCardClass, topicTagClass } from "~/utils/ui";

const props = defineProps<{
  minutes: MinutesMeta[];
}>();

const search = ref("");

function matchesKeyword(minutes: MinutesMeta, keyword: string) {
  return (
    minutes.title.toLowerCase().includes(keyword) ||
    minutes.topics.some((topic) => topic.toLowerCase().includes(keyword))
  );
}

const filteredMinutes = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) {
    return props.minutes;
  }

  return props.minutes.filter((minutes) => matchesKeyword(minutes, keyword));
});
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
      <label
        for="minutes-search"
        class="mb-2 block text-sm font-medium text-slate-700"
      >
        キーワード検索
      </label>
      <input
        id="minutes-search"
        v-model="search"
        type="search"
        class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        placeholder="タイトルやトピックで検索"
      >
    </div>

    <div v-if="filteredMinutes.length" class="space-y-4">
      <NuxtLink
        v-for="minutes in filteredMinutes"
        :key="minutes.slug"
        :to="`/minutes/${minutes.slug}`"
        :class="`${interactiveCardClass} block p-5`"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h3 class="text-lg font-semibold tracking-tight text-slate-900">{{ minutes.title }}</h3>
          <span class="text-sm text-slate-500">{{ minutes.date }}</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="topic in minutes.topics"
            :key="topic"
            :class="topicTagClass"
          >
            {{ topic }}
          </span>
        </div>
        <p class="mt-4 text-sm text-slate-500">参加者: {{ minutes.attendees.join("、") }}</p>
      </NuxtLink>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      該当する議事録が見つかりません。
    </p>
  </div>
</template>
