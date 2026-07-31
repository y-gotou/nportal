<script setup lang="ts">
import {
  formatDateRange,
  formatDateWithWeekday,
  formatUpdatedAt,
  japaneseTextClass,
} from "~/utils/news";
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
  default: () => ({
    date: null,
    updatedAt: null,
    prevDate: null,
    nextDate: null,
    articles: [],
  }),
});

const { data: weeklyData } = await useFetch<NewsWeeklyResponse>("/api/news/weekly", {
  query: weeklyQuery,
  default: () => ({ digest: null, prevDate: null, nextDate: null }),
});

const articles = computed(() => dailyData.value?.articles ?? []);
const digest = computed(() => weeklyData.value?.digest ?? null);
const isDaily = computed(() => activeTab.value === "daily");

const currentDate = computed(() =>
  isDaily.value ? dailyData.value?.date ?? null : digest.value?.publishedDate ?? null,
);
const prevDate = computed(() =>
  isDaily.value ? dailyData.value?.prevDate : weeklyData.value?.prevDate,
);
const nextDate = computed(() =>
  isDaily.value ? dailyData.value?.nextDate : weeklyData.value?.nextDate,
);

// 過去日を表示しているときに「今日の」と称さない
const heading = computed(() =>
  isDaily.value && !dailyData.value?.nextDate ? "今日のAIニュース" : "AIニュース",
);

// 本文中の改行は段落の区切りとして扱う(pre-line だと 1 行だけ不自然に切れる)
const overviewParagraphs = computed(() =>
  (digest.value?.overview ?? "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean),
);

// 週次が対象とするのは掲載日から遡る 7 日間
const digestRange = computed(() => {
  const end = digest.value?.publishedDate;
  if (!end) return "";
  const start = new Date(`${end}T00:00:00`);
  start.setDate(start.getDate() - 6);
  return formatDateRange(
    `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
    end,
  );
});

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
    ? "border-foreground font-bold text-foreground"
    : "border-transparent font-medium text-muted hover:text-foreground";

const dateNavClass =
  "flex h-8 w-8 items-center justify-center rounded-md text-[15px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-default disabled:text-border disabled:hover:bg-transparent";
</script>

<template>
  <!-- デザイン案どおり、本文を白パネルに載せて背景と分離する(/news のみ) -->
  <div class="min-h-[calc(100vh-73px)] bg-[#eceff3] dark:bg-[#0b1120]">
    <PageContainer>
      <div
        class="rounded-xl border border-border bg-surface shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)]"
      >
        <header class="px-6 pt-8 md:px-12">
          <p class="text-[11px] font-bold tracking-[0.2em] text-muted">AI NEWS</p>
          <div class="mt-2.5 flex items-end justify-between gap-8">
            <h1 class="text-[32px] font-bold leading-[1.25] tracking-tight text-foreground">
              {{ heading }}
            </h1>
            <p v-if="dailyData?.updatedAt" class="text-right text-xs leading-relaxed text-muted">
              最終更新<br>
              <span class="text-[13px] font-semibold text-foreground">
                {{ formatUpdatedAt(dailyData.updatedAt) }}
              </span>
            </p>
          </div>
        </header>

        <div
          class="sticky top-[73px] z-30 mt-5 flex items-center justify-between border-b border-border bg-surface px-6 md:px-12"
        >
          <div class="flex" role="tablist">
            <button
              v-for="tab in (['daily', 'weekly'] as const)"
              :key="tab"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab"
              class="-mb-px mx-3 border-b-2 px-1 py-3.5 text-[14.5px] transition-colors"
              :class="tabClass(tab)"
              @click="selectTab(tab)"
            >
              {{ tab === "daily" ? "今日" : "週次ダイジェスト" }}
            </button>
          </div>

          <div v-if="currentDate" class="flex items-center gap-0.5 pb-1.5">
            <button
              type="button"
              :class="dateNavClass"
              :disabled="!prevDate"
              aria-label="前の掲載日"
              @click="goToDate(prevDate)"
            >
              ←
            </button>
            <span
              class="min-w-[150px] text-center text-[13px] font-semibold text-foreground tabular-nums"
            >
              {{ formatDateWithWeekday(currentDate) }}
            </span>
            <button
              type="button"
              :class="dateNavClass"
              :disabled="!nextDate"
              aria-label="次の掲載日"
              @click="goToDate(nextDate)"
            >
              →
            </button>
          </div>
        </div>

        <div v-if="isDaily" class="px-6 pb-11 pt-2 md:px-12">
          <template v-if="articles.length">
            <NewsArticleRow
              v-for="(article, index) in articles"
              :key="article.id"
              :article="article"
              :index="index"
            />
          </template>
          <p v-else class="py-16 text-center text-sm text-muted">
            本日のニュースはまだ公開されていません。
          </p>
        </div>

        <div v-else class="px-6 pb-11 pt-8 md:px-12">
          <template v-if="digest">
            <p class="text-xs font-bold tracking-[0.16em] text-muted">{{ digestRange }}</p>
            <h2
              class="mt-2.5 text-[27px] font-bold tracking-tight text-foreground"
              :class="japaneseTextClass"
            >
              今週の{{ digest.articles.length }}つの動き
            </h2>
            <div
              class="mt-3 max-w-[860px] space-y-3 text-[15px] leading-[2] text-foreground"
              :class="japaneseTextClass"
            >
              <p v-for="(paragraph, index) in overviewParagraphs" :key="index">
                {{ paragraph }}
              </p>
            </div>
            <div class="mt-7 border-t border-border">
              <NewsDigestRow
                v-for="(article, index) in digest.articles"
                :key="article.id"
                :article="article"
                :index="index"
              />
            </div>
          </template>
          <p v-else class="py-16 text-center text-sm text-muted">
            週次ダイジェストはまだ公開されていません。
          </p>
        </div>
      </div>
    </PageContainer>
  </div>
</template>
