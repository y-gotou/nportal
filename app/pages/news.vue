<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { secondaryButtonClass } from "~/utils/ui";
import type { NewsListResponse, NewsWeeklyResponse } from "~~/types/portal";

type NewsTab = "daily" | "weekly";

const route = useRoute();
const router = useRouter();

const activeTab = ref<NewsTab>(route.query.tab === "weekly" ? "weekly" : "daily");
const selectedDate = ref<string | null>(
  typeof route.query.date === "string" ? route.query.date : null,
);

const dailyQuery = computed(() => ({
  date: activeTab.value === "daily" ? selectedDate.value || undefined : undefined,
}));
const weeklyQuery = computed(() => ({
  date: activeTab.value === "weekly" ? selectedDate.value || undefined : undefined,
}));

const { data: dailyData } = await useFetch<NewsListResponse>("/api/news", {
  query: dailyQuery,
  default: () => ({ date: null, prevDate: null, nextDate: null, articles: [] }),
});

const { data: weeklyData } = await useFetch<NewsWeeklyResponse>("/api/news/weekly", {
  query: weeklyQuery,
  default: () => ({ digest: null, prevDate: null, nextDate: null }),
});

const articles = computed(() => dailyData.value?.articles ?? []);
const digest = computed(() => weeklyData.value?.digest ?? null);

const currentDate = computed(() =>
  activeTab.value === "daily"
    ? dailyData.value?.date ?? null
    : digest.value?.publishedDate ?? null,
);
const prevDate = computed(() =>
  activeTab.value === "daily" ? dailyData.value?.prevDate : weeklyData.value?.prevDate,
);
const nextDate = computed(() =>
  activeTab.value === "daily" ? dailyData.value?.nextDate : weeklyData.value?.nextDate,
);

// タブごとに掲載日が異なるため、切り替え時は最新に戻す
function selectTab(tab: NewsTab) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  selectedDate.value = null;
}

function goToDate(date: string | null | undefined) {
  if (!date) return;
  selectedDate.value = date;
}

// 指定日に掲載がない場合はサーバー側で直前の掲載日に解決される
function onDateInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  selectedDate.value = value || null;
}

watch([activeTab, selectedDate], () => {
  router.replace({
    query: {
      tab: activeTab.value === "weekly" ? "weekly" : undefined,
      date: selectedDate.value || undefined,
    },
  });
});

const tabClass = (tab: NewsTab) =>
  activeTab.value === tab
    ? "border-blue-500 text-blue-600 dark:text-blue-400"
    : "border-transparent text-muted hover:text-foreground";
</script>

<template>
  <PageContainer>
    <SectionHeader
      eyebrow="AI NEWS"
      title="AI ニュース"
      description="AI が毎朝ニュースを選定し、勉強会の関心に沿って並べています。👍 / 👎 の評価は次回の選定に反映されます。"
    />

    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div class="flex gap-1 border-b border-border" role="tablist">
        <button
          v-for="tab in (['daily', 'weekly'] as const)"
          :key="tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab"
          class="border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
          :class="tabClass(tab)"
          @click="selectTab(tab)"
        >
          {{ tab === "daily" ? "今日" : "週次ダイジェスト" }}
        </button>
      </div>

      <div v-if="currentDate" class="flex items-center gap-2">
        <button
          type="button"
          :class="secondaryButtonClass"
          class="!px-3 !py-2"
          :disabled="!prevDate"
          :aria-label="'前の掲載日'"
          @click="goToDate(prevDate)"
        >
          ←
        </button>
        <input
          type="date"
          :value="currentDate"
          class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          aria-label="掲載日を指定"
          @change="onDateInput"
        >
        <button
          type="button"
          :class="secondaryButtonClass"
          class="!px-3 !py-2"
          :disabled="!nextDate"
          :aria-label="'次の掲載日'"
          @click="goToDate(nextDate)"
        >
          →
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'daily'">
      <template v-if="articles.length">
        <p class="mb-4 text-sm text-muted">{{ formatDisplayDate(currentDate!) }} の掲載</p>
        <div class="space-y-4">
          <NewsArticleCard
            v-for="article in articles"
            :key="article.id"
            :article="article"
          />
        </div>
      </template>
      <p v-else class="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
        本日のニュースはまだ公開されていません。
      </p>
    </div>

    <div v-else>
      <template v-if="digest">
        <section class="mb-6 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p class="text-xs font-semibold tracking-[0.16em] text-muted">
            {{ formatDisplayDate(digest.publishedDate) }}
          </p>
          <h2 class="mt-2 text-xl font-bold tracking-tight text-foreground">今週の AI 動向</h2>
          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-foreground">
            {{ digest.overview }}
          </p>
        </section>
        <div class="space-y-4">
          <NewsArticleCard
            v-for="article in digest.articles"
            :key="article.id"
            :article="article"
          />
        </div>
      </template>
      <p v-else class="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
        週次ダイジェストはまだ公開されていません。
      </p>
    </div>
  </PageContainer>
</template>
