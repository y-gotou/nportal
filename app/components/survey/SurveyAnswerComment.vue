<script setup lang="ts">
import { formatCommentDate } from "~/utils/survey";

defineProps<{
  comment: string;
  updatedAt: string | null;
}>();
</script>

<template>
  <div class="mt-3 border-l-2 border-blue-500/40 pl-3 text-foreground">
    <p class="whitespace-pre-wrap break-words">{{ comment }}</p>
    <p v-if="updatedAt" class="mt-1 text-xs text-muted">{{ formatCommentDate(updatedAt) }}</p>
  </div>
</template>
