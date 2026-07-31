<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { impactAxisHeading } from "~/utils/news";
import type { NewsArticle } from "~~/types/portal";

defineProps<{
  article: NewsArticle;
}>();
</script>

<template>
  <article class="rounded-xl border border-border bg-surface p-4 shadow-sm">
    <h3 class="text-pretty text-base font-bold leading-6 text-foreground">
      {{ article.title }}
    </h3>

    <NewsSummary
      v-if="article.summary"
      class="mt-2"
      :text="article.summary"
      :glossary="article.glossary"
    />

    <!-- 見出しは常に表示し、観点だけは折りたたんだ状態でも読めるようにする -->
    <details v-if="article.whyImportant" class="group mt-2">
      <summary
        class="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-foreground"
      >
        {{ impactAxisHeading(article.impactAxis) }}
        <span class="text-xs text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <p class="mt-1 text-sm leading-6 text-foreground">{{ article.whyImportant }}</p>
    </details>

    <div
      class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-2.5"
    >
      <p class="flex flex-wrap items-center gap-x-2 text-sm">
        <a
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {{ article.source }} の元記事を読む →
        </a>
        <span v-if="article.articleDate" class="text-xs text-muted">
          {{ formatDisplayDate(article.articleDate) }}
        </span>
      </p>
      <div class="flex items-center gap-3 text-sm text-muted">
        <span>👍 {{ article.upCount }}</span>
        <span>👎 {{ article.downCount }}</span>
      </div>
    </div>
  </article>
</template>
