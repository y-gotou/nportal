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
  <section class="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
    <div class="flex h-[calc(100dvh-8.5rem)] min-h-96 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <ChatRoom :schedule-id="scheduleId" />
    </div>
  </section>
</template>
