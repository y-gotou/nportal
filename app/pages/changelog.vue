<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { surfaceCardClass } from "~/utils/ui";
import {
  changelogCategoryBadgeClass,
  changelogCategoryClasses,
  changelogCategoryLabels,
  changelogCategoryOrder,
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

// 日付グループ内はカテゴリの表示順に並べる(同カテゴリ内は元の順序を保持)
for (const group of groups) {
  group.entries.sort(
    (a, b) =>
      changelogCategoryOrder.indexOf(a.category) -
      changelogCategoryOrder.indexOf(b.category),
  );
}

useSeoMeta({
  title: "更新情報",
  description: "N Portal の新機能・改善のお知らせを確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader
      title="更新情報"
      description="N Portal の新機能・改善のお知らせです。"
    />

    <div v-if="groups.length" class="space-y-4">
      <section v-for="group in groups" :key="group.date" class="space-y-4" :class="surfaceCardClass">
        <h2 class="border-b border-border pb-2 text-base font-semibold tracking-tight text-foreground">
          <time :datetime="group.date">{{ formatDisplayDate(group.date) }}</time>
        </h2>
        <ul class="space-y-4">
          <li
            v-for="(entry, index) in group.entries"
            :key="entry.title"
            class="flex items-start gap-3"
          >
            <!-- 同じカテゴリが続く場合、バッジは先頭の 1 件のみ表示する -->
            <span
              v-if="index === 0 || group.entries[index - 1]?.category !== entry.category"
              :class="[changelogCategoryBadgeClass, changelogCategoryClasses[entry.category]]"
            >
              {{ changelogCategoryLabels[entry.category] }}
            </span>
            <span v-else class="w-20 shrink-0" aria-hidden="true" />
            <!-- バッジ(高さ約24px)とタイトル行(20px)の中心を揃えるためのオフセット -->
            <div class="mt-0.5 min-w-0">
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
