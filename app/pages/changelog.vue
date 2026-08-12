<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import {
  changelogCategoryClasses,
  changelogCategoryLabels,
  changelogEntries,
} from "~/utils/changelog";

const entries = [...changelogEntries].sort((a, b) =>
  b.date.localeCompare(a.date),
);

useSeoMeta({
  title: "更新情報",
  description: "N Portal の新機能・改善のお知らせを確認できます。",
});
</script>

<template>
  <PageContainer size="medium">
    <SectionHeader
      title="更新情報"
      description="N Portal の新機能・改善のお知らせです。"
    />

    <ol v-if="entries.length" class="space-y-3">
      <li
        v-for="entry in entries"
        :key="`${entry.date}-${entry.title}`"
        class="rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-center gap-3">
          <time :datetime="entry.date" class="text-sm text-muted">
            {{ formatDisplayDate(entry.date) }}
          </time>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            :class="changelogCategoryClasses[entry.category]"
          >
            {{ changelogCategoryLabels[entry.category] }}
          </span>
        </div>
        <h2 class="mt-2 text-pretty text-lg font-semibold tracking-tight text-foreground">
          {{ entry.title }}
        </h2>
        <p v-if="entry.description" class="mt-1 text-sm leading-6 text-muted">
          {{ entry.description }}
        </p>
      </li>
    </ol>

    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      更新情報はまだありません。
    </p>
  </PageContainer>
</template>
