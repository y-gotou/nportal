<script setup lang="ts">
import type { MinutesMeta } from "~~/types/portal";
import { formatDisplayDate } from "#shared/utils/content";
import { interactiveCardClass, topicTagClass } from "~/utils/ui";

const props = defineProps<{
  minutes: MinutesMeta[];
}>();

const route = useRoute();
const router = useRouter();
const search = ref(typeof route.query.q === "string" ? route.query.q : "");
// 入力中の値ではなく、一覧に反映済みの検索語で判定する
const isFiltered = computed(() => typeof route.query.q === "string" && route.query.q !== "");

// 絞り込みはサーバ側(/api/minutes?q=)で行うため、route への反映のみデバウンスして行う
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(search, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    router.replace({
      query: {
        ...route.query,
        q: value.trim() || undefined,
      },
    });
  }, 300);
});

onUnmounted(() => clearTimeout(debounceTimer));

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
    <div class="rounded-xl border border-border bg-surface p-5 shadow-sm">
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
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        placeholder="タイトル・トピック・本文で検索…"
      >
    </div>

    <div v-if="props.minutes.length" class="space-y-3">
      <NuxtLink
        v-for="minutes in props.minutes"
        :key="minutes.slug"
        :to="`/minutes/${minutes.slug}`"
        :class="`${interactiveCardClass} block p-5`"
      >
        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <h3 class="text-pretty text-lg font-semibold tracking-tight text-foreground">{{ minutes.title }}</h3>
          <span class="shrink-0 text-sm text-muted">{{ formatDisplayDate(minutes.date) }}</span>
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

    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      {{ isFiltered ? "条件に合う議事録はありません。" : "議事録はまだありません。" }}
    </p>
  </div>
</template>
