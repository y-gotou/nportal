<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { impactAxisHeading } from "~/utils/news";
import { topicTagClass } from "~/utils/ui";
import type { NewsArticle } from "~~/types/portal";

defineProps<{
  article: NewsArticle;
}>();
</script>

<template>
  <article class="rounded-xl border border-border bg-surface p-5 shadow-sm md:p-6">
    <h3 class="text-pretty text-lg font-bold leading-7 text-foreground">
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

    <section
      v-if="article.glossary.length"
      class="mt-3 rounded-lg border border-border p-4"
    >
      <h4 class="text-xs font-semibold tracking-[0.16em] text-muted">用語</h4>
      <dl class="mt-2 space-y-2">
        <div v-for="term in article.glossary" :key="term.term">
          <dt class="text-sm font-semibold text-foreground">{{ term.term }}</dt>
          <dd class="mt-0.5 text-sm leading-6 text-muted">{{ term.description }}</dd>
        </div>
      </dl>
    </section>

    <div v-if="article.tags.length" class="mt-4 flex flex-wrap gap-2">
      <span v-for="tag in article.tags" :key="tag" :class="topicTagClass">#{{ tag }}</span>
    </div>

    <div
      class="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4"
    >
      <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
      <div class="flex items-center gap-4 text-sm text-muted">
        <span>👍 {{ article.upCount }}</span>
        <span>👎 {{ article.downCount }}</span>
      </div>
    </div>
  </article>
</template>
