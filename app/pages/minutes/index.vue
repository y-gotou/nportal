<script setup lang="ts">
import { getMinutesList } from "~~/utils/content";

const minutes = getMinutesList();

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
