<script setup lang="ts">
import type { MinutesMeta } from "~~/types/portal";
import { formatDisplayDate } from "~~/utils/content";
import { interactiveCardClass, topicTagClass } from "~/utils/ui";

const props = defineProps<{
  minutes: MinutesMeta[];
}>();

const route = useRoute();
const router = useRouter();
const search = ref(typeof route.query.q === "string" ? route.query.q : "");

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

watch(search, (value) => {
  router.replace({
    query: {
      ...route.query,
      q: value.trim() || undefined,
    },
  });
});

watch(
  () => route.query.q,
  (value) => {
    const nextValue = typeof value === "string" ? value : "";

    if (nextValue !== search.value) {
      search.value = nextValue;
    }
  },
);
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-xl border border-border bg-surface-hover p-5 shadow-sm">
      <label
        for="minutes-search"
        class="mb-2 block text-sm font-medium text-foreground"
      >
        キーワード検索
      </label>
      <input
        id="minutes-search"
        v-model="search"
        name="minutes-search"
        type="search"
        autocomplete="off"
        class="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        placeholder="タイトルやトピックで検索…"
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
          <h3 class="text-lg font-semibold tracking-tight text-foreground">{{ minutes.title }}</h3>
          <span class="text-sm text-muted">{{ formatDisplayDate(minutes.date) }}</span>
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
      </NuxtLink>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      該当する議事録が見つかりません。
    </p>
  </div>
</template>
