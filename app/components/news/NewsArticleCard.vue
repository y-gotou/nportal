<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { impactAxisHeading } from "~/utils/news";
import { topicTagClass } from "~/utils/ui";
import type { NewsArticle } from "~~/types/portal";

defineProps<{
  article: NewsArticle;
  rank: number;
}>();
</script>

<template>
  <article class="rounded-xl border border-border bg-surface p-5 shadow-sm md:p-6">
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span
        class="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#2d3748] px-1.5 font-semibold text-white"
      >
        {{ rank }}
      </span>
      <span class="font-medium text-foreground">{{ article.category }}</span>
      <span v-if="article.articleDate">・{{ formatDisplayDate(article.articleDate) }}</span>
    </div>

    <h3 class="mt-3 text-pretty text-lg font-bold leading-7 text-foreground">
      {{ article.title }}
    </h3>

    <ul v-if="article.summary.length" class="mt-3 space-y-1.5">
      <li
        v-for="(point, index) in article.summary"
        :key="index"
        class="flex gap-2 text-sm leading-6 text-foreground"
      >
        <span class="text-muted" aria-hidden="true">•</span>
        <span>{{ point }}</span>
      </li>
    </ul>

    <div v-if="article.whyImportant" class="mt-4 rounded-lg bg-surface-hover p-4">
      <p class="text-sm font-semibold text-foreground">
        {{ impactAxisHeading(article.impactAxis) }}
      </p>
      <p class="mt-1.5 text-sm leading-6 text-foreground">{{ article.whyImportant }}</p>
    </div>

    <dl v-if="article.glossary.length" class="mt-3 space-y-1">
      <div
        v-for="term in article.glossary"
        :key="term.term"
        class="flex flex-wrap gap-x-2 text-xs leading-5 text-muted"
      >
        <dt class="font-medium text-foreground">{{ term.term }}</dt>
        <dd>{{ term.description }}</dd>
      </div>
    </dl>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <span v-for="tag in article.tags" :key="tag" :class="topicTagClass">#{{ tag }}</span>
      <span class="text-xs text-muted">— {{ article.source }}</span>
    </div>

    <div
      class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
    >
      <div class="flex items-center gap-4 text-sm text-muted">
        <span>👍 {{ article.upCount }}</span>
        <span>👎 {{ article.downCount }}</span>
      </div>
      <a
        :href="article.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        元記事を読む →
      </a>
    </div>
  </article>
</template>
