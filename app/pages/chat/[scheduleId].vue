<script setup lang="ts">
import { fetchCurrentUser } from "~/composables/useCurrentUser";

const route = useRoute();

const scheduleId = Number(route.params.scheduleId);

if (!Number.isInteger(scheduleId) || scheduleId < 1) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}

await fetchCurrentUser();

useSeoMeta({
  title: "チャット",
  description: "会議中のチャットです。",
});
</script>

<template>
  <!-- ヘッダー(約73px)下の全面をチャットが占有する -->
  <div class="flex h-[calc(100dvh-73px)] min-h-96 flex-col bg-background">
    <ChatRoom :schedule-id="scheduleId" />
  </div>
</template>
