<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { secondaryButtonClass } from "~/utils/ui";
import type { ResourceMarkdownResponse } from "~~/types/portal";

const route = useRoute();
const id = String(route.params.id);

const { data, error } = await useFetch<ResourceMarkdownResponse>(`/api/resources/${id}/markdown`);

if (error.value || !data.value?.resource) {
  throw createError({ statusCode: 404, statusMessage: "Markdown resource not found" });
}

const resource = computed(() => data.value!.resource);
const contentHtml = computed(() => data.value!.contentHtml);

useSeoMeta({
  title: () => resource.value.title,
  description: () => `${resource.value.fileName ?? "Markdown"} の資料です。`,
});
</script>

<template>
  <PageContainer size="wide">
    <div class="mb-4 flex flex-wrap gap-3">
      <NuxtLink to="/resources" :class="secondaryButtonClass">
        <IconArrowLeft />
        資料共有へ戻る
      </NuxtLink>
      <a
        :href="`/api/resources/${resource.id}/file`"
        target="_blank"
        rel="noreferrer"
        :class="secondaryButtonClass"
      >
        元ファイルを開く
      </a>
    </div>

    <div class="mb-6">
      <p class="text-sm text-muted">
        {{ formatDisplayDate(resource.date) }}
        <span class="ml-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted">{{ resource.type }}</span>
      </p>
      <h1 class="mt-2 text-pretty text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {{ resource.title }}
      </h1>
      <dl class="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm text-muted">
        <dt class="text-xs font-semibold tracking-[0.14em] text-muted">ファイル</dt>
        <dd>{{ resource.fileName }}</dd>
        <dt v-if="resource.submittedBy" class="text-xs font-semibold tracking-[0.14em] text-muted">投稿者</dt>
        <dd v-if="resource.submittedBy">{{ resource.submittedBy }}</dd>
      </dl>
    </div>

    <article
      class="prose max-w-none rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8"
      v-html="contentHtml"
    />

    <div v-if="resource.relatedMinutesSlug" class="mt-6">
      <NuxtLink :to="`/minutes/${resource.relatedMinutesSlug}`" :class="secondaryButtonClass">
        関連議事録
      </NuxtLink>
    </div>
  </PageContainer>
</template>
