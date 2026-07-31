<script setup lang="ts">
import { categoryClass, formatRank, impactAxisLabel, japaneseTextClass } from "~/utils/news";
import type { NewsArticle } from "~~/types/portal";

const props = defineProps<{
  article: NewsArticle;
  index: number;
}>();

const isOpen = ref(false);
const rank = computed(() => formatRank(props.index));
</script>

<template>
  <article
    class="flex gap-7 border-b border-border py-5 transition-colors hover:bg-surface-hover/40"
  >
    <div class="w-13 shrink-0 pt-0.5">
      <span class="block text-[22px] font-bold leading-none tracking-tight text-slate-300 tabular-nums dark:text-slate-600">
        {{ rank }}
      </span>
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2.5">
        <span
          class="rounded px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap"
          :class="categoryClass(article.category)"
        >
          {{ article.category }}
        </span>
        <span class="text-xs text-muted">
          {{ article.source }}<template v-if="article.articleDate">・{{ article.articleDate.slice(5).replace("-", "/") }}</template>
        </span>
      </div>

      <h3
        class="mt-2 text-[19px] font-bold leading-[1.6] tracking-tight text-foreground"
        :class="japaneseTextClass"
      >
        {{ article.title }}
      </h3>

      <NewsSummary
        v-if="article.summary"
        class="mt-[7px] text-[13.5px] leading-[1.85] text-slate-600 dark:text-slate-300"
        :class="japaneseTextClass"
        :text="article.summary"
        :glossary="article.glossary"
      />

      <div class="mt-3 flex flex-wrap items-center gap-4">
        <button
          v-if="article.whyImportant"
          type="button"
          class="min-w-[148px] text-left text-[12.5px] font-semibold text-blue-700 dark:text-blue-400"
          :aria-expanded="isOpen"
          @click="isOpen = !isOpen"
        >
          {{ isOpen ? "要点と観点を閉じる ▴" : "要点と観点を見る ▾" }}
        </button>
        <a
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[12.5px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
        >
          元記事 →
        </a>
      </div>

      <div
        v-if="isOpen && article.whyImportant"
        class="mt-3 flex flex-col gap-2 border-l-2 border-border py-0.5 pl-4 sm:flex-row sm:gap-5"
      >
        <span
          class="shrink-0 pt-0.5 text-[11px] font-bold leading-[1.6] tracking-wide text-foreground sm:w-28"
        >
          {{ impactAxisLabel(article.impactAxis) }}
        </span>
        <p
          class="min-w-0 flex-1 text-[13.5px] leading-[1.9] text-foreground"
          :class="japaneseTextClass"
        >
          {{ article.whyImportant }}
        </p>
      </div>
    </div>

    <div class="hidden w-25 shrink-0 justify-end pt-0.5 sm:flex">
      <span class="text-xs text-muted tabular-nums">
        👍 {{ article.upCount }}　👎 {{ article.downCount }}
      </span>
    </div>
  </article>
</template>
