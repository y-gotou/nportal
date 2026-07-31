<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { impactAxisHeading } from "~/utils/news";
import type { NewsArticle } from "~~/types/portal";

defineProps<{
  article: NewsArticle;
}>();
</script>

<template>
  <article class="rounded-xl border border-border bg-surface p-5 shadow-sm md:p-6">
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <h3 class="min-w-0 flex-1 text-pretty text-lg font-bold leading-7 text-foreground">
        {{ article.title }}
      </h3>
      <p class="shrink-0 text-xs leading-5 sm:text-right">
        <span class="block text-muted">
          {{ article.source }}
          <template v-if="article.articleDate">
            ・{{ formatDisplayDate(article.articleDate) }}
          </template>
        </span>
        <a
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          元記事を読む →
        </a>
      </p>
    </div>

    <NewsSummary
      v-if="article.summary"
      class="mt-3"
      :text="article.summary"
      :glossary="article.glossary"
    />

    <!-- 見出しは常に表示し、折りたたんだ状態でも観点が読み取れるようにする -->
    <details v-if="article.whyImportant" class="group mt-4">
      <summary class="flex cursor-pointer list-none items-center gap-1.5">
        <span
          class="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold text-foreground"
        >
          {{ impactAxisHeading(article.impactAxis) }}
        </span>
        <span class="text-xs text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <p class="mt-2 text-sm leading-6 text-foreground">{{ article.whyImportant }}</p>
    </details>

    <div class="mt-4 flex items-center gap-4 border-t border-border pt-4 text-sm text-muted">
      <span>👍 {{ article.upCount }}</span>
      <span>👎 {{ article.downCount }}</span>
    </div>
  </article>
</template>
