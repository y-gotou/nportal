<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { surfaceCardClass } from "~/utils/ui";
import {
  changelogCategoryClasses,
  changelogCategoryLabels,
  changelogEntries,
  type ChangelogEntry,
} from "~/utils/changelog";

const sorted = [...changelogEntries].sort((a, b) =>
  b.date.localeCompare(a.date),
);

const groups = sorted.reduce<{ date: string; entries: ChangelogEntry[] }[]>(
  (acc, entry) => {
    const last = acc[acc.length - 1];
    if (last && last.date === entry.date) {
      last.entries.push(entry);
    } else {
      acc.push({ date: entry.date, entries: [entry] });
    }
    return acc;
  },
  [],
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

    <div v-if="groups.length" class="space-y-10" :class="surfaceCardClass">
      <section v-for="group in groups" :key="group.date" class="space-y-4">
        <h2 class="border-b border-border pb-2 text-base font-semibold tracking-tight text-foreground">
          <time :datetime="group.date">{{ formatDisplayDate(group.date) }}</time>
        </h2>
        <ul class="space-y-4">
          <li
            v-for="entry in group.entries"
            :key="entry.title"
            class="flex items-start gap-3"
          >
            <span
              class="mt-0.5 inline-flex w-20 shrink-0 justify-center rounded-full px-2 py-1 text-xs font-medium"
              :class="changelogCategoryClasses[entry.category]"
            >
              {{ changelogCategoryLabels[entry.category] }}
            </span>
            <div class="min-w-0">
              <h3 class="text-pretty text-sm font-semibold tracking-tight text-foreground">
                {{ entry.title }}
              </h3>
              <p v-if="entry.description" class="mt-1 text-sm leading-6 text-muted">
                {{ entry.description }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      更新情報はまだありません。
    </p>
  </PageContainer>
</template>
