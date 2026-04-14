<script setup lang="ts">
import type { MinutesListResponse } from "~~/types/portal";

const { data } = await useFetch<MinutesListResponse>("/api/minutes", {
  default: () => ({ minutes: [] }),
});

const minutes = computed(() => data.value?.minutes ?? []);

useSeoMeta({
  title: "議事録",
  description: "開催済み勉強会の議事録一覧です。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader
      title="議事録一覧"
      description="タイトルやトピックで絞り込みながら振り返れます。"
    />
    <MinutesSearch :minutes="minutes" />
  </PageContainer>
</template>
