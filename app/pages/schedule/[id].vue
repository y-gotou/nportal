<script setup lang="ts">
import { formatDisplayDateTime } from "#shared/utils/content";
import { secondaryButtonClass } from "~/utils/ui";
import type { ScheduleListResponse } from "~~/types/portal";

const route = useRoute();
const id = Number(route.params.id);

const { data, error } = await useFetch<ScheduleListResponse>("/api/schedule");
if (error.value) {
  throw createError({ statusCode: 500, statusMessage: "Failed to load schedule" });
}

const item = data.value?.schedule.find((s) => s.id === id);
if (!item) {
  throw createError({ statusCode: 404, statusMessage: "Schedule item not found" });
}

useSeoMeta({
  title: `${item.title} の議題`,
  description: `${formatDisplayDateTime(item.date, item.time)} 開催分の議題です。`,
});
</script>

<template>
  <PageContainer size="wide">
    <div class="mb-4 flex flex-wrap gap-3">
      <NuxtLink to="/schedule" :class="secondaryButtonClass">
        <IconArrowLeft />
        一覧へ戻る
      </NuxtLink>
    </div>

    <div class="mb-6">
      <h1 class="text-pretty text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {{ item.title }}
      </h1>
      <dl class="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm text-muted">
        <dt class="text-xs font-semibold tracking-[0.14em] text-muted">開催日時</dt>
        <dd>{{ formatDisplayDateTime(item.date, item.time) }}</dd>
        <template v-if="item.location">
          <dt class="text-xs font-semibold tracking-[0.14em] text-muted">開催場所</dt>
          <dd>{{ item.location }}</dd>
        </template>
        <template v-if="item.topics.length">
          <dt class="text-xs font-semibold tracking-[0.14em] text-muted">トピック</dt>
          <dd>{{ item.topics.join("、") }}</dd>
        </template>
      </dl>
    </div>

    <article
      v-if="item.agendaHtml"
      class="prose max-w-none rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8"
      v-html="item.agendaHtml"
    />
    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      議題はまだありません。
    </p>
  </PageContainer>
</template>
