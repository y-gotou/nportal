<script setup lang="ts">
import { categoryClass, formatRank, japaneseTextClass, stripTermMarkers } from "~/utils/news";
import type { NewsArticle } from "~~/types/portal";

const props = defineProps<{
  article: NewsArticle;
  index: number;
}>();

const rank = computed(() => formatRank(props.index));
const summaryText = computed(() => stripTermMarkers(props.article.summary));
</script>

<template>
  <article class="flex gap-7 border-b border-border py-5">
    <div class="w-13 shrink-0">
      <span class="block text-[22px] font-bold leading-none text-slate-300 tabular-nums dark:text-slate-600">
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
        class="mt-2 text-[19px] font-bold leading-[1.6] text-foreground"
        :class="japaneseTextClass"
      >
        <a :href="article.url" target="_blank" rel="noopener noreferrer" class="hover:underline">
          {{ article.title }}
        </a>
      </h3>

      <p
        class="mt-[7px] text-[13.5px] leading-[1.85] text-slate-600 dark:text-slate-300"
        :class="japaneseTextClass"
      >
        {{ summaryText }}
      </p>
    </div>
  </article>
</template>
