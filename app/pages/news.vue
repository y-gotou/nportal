<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import type {
  NewsDatesResponse,
  NewsListResponse,
  NewsWeeklyResponse,
} from "~~/types/portal";

type NewsTab = "daily" | "weekly";

const route = useRoute();
const router = useRouter();

const activeTab = ref<NewsTab>(route.query.tab === "weekly" ? "weekly" : "daily");
const selectedDate = ref<string | null>(
  typeof route.query.date === "string" ? route.query.date : null,
);

const { data: datesData } = await useFetch<NewsDatesResponse>("/api/news/dates", {
  default: () => ({ daily: [], weekly: [] }),
});

const { data: dailyData } = await useFetch<NewsListResponse>("/api/news", {
  query: computed(() => ({ date: activeTab.value === "daily" ? selectedDate.value || undefined : undefined })),
  default: () => ({ date: null, articles: [] }),
});

const { data: weeklyData } = await useFetch<NewsWeeklyResponse>("/api/news/weekly", {
  query: computed(() => ({ date: activeTab.value === "weekly" ? selectedDate.value || undefined : undefined })),
  default: () => ({ digest: null }),
});

const availableDates = computed(() =>
  activeTab.value === "daily" ? datesData.value.daily : datesData.value.weekly,
);
const articles = computed(() => dailyData.value?.articles ?? []);
const digest = computed(() => weeklyData.value?.digest ?? null);
const currentDate = computed(() =>
  activeTab.value === "daily" ? dailyData.value?.date ?? null : digest.value?.publishedDate ?? null,
);

// タブを切り替えると掲載日の一覧が変わるため、日付指定は解除する
function selectTab(tab: NewsTab) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  selectedDate.value = null;
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
    <PageHero
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

      <label v-if="availableDates.length" class="flex items-center gap-2 text-sm text-muted">
        <span>掲載日</span>
        <select
          v-model="selectedDate"
          class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option :value="null">最新</option>
          <option v-for="date in availableDates" :key="date" :value="date">
            {{ formatDisplayDate(date) }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="activeTab === 'daily'">
      <template v-if="articles.length">
        <p class="mb-4 text-sm text-muted">{{ formatDisplayDate(currentDate!) }} の掲載</p>
        <div class="space-y-4">
          <NewsArticleCard
            v-for="(article, index) in articles"
            :key="article.id"
            :article="article"
            :rank="index + 1"
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
          <SectionHeader
            :eyebrow="formatDisplayDate(digest.publishedDate)"
            title="今週の AI 動向"
          />
          <p class="whitespace-pre-line text-sm leading-7 text-foreground">
            {{ digest.overview }}
          </p>
        </section>
        <div class="space-y-4">
          <NewsArticleCard
            v-for="(article, index) in digest.articles"
            :key="article.id"
            :article="article"
            :rank="index + 1"
          />
        </div>
      </template>
      <p v-else class="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
        週次ダイジェストはまだ公開されていません。
      </p>
    </div>
  </PageContainer>
</template>
