<script setup lang="ts">
import { formatCommentDate, surveyCommentBandClass } from "~/utils/survey";

defineProps<{
  comment: string;
  updatedAt: string | null;
}>();
</script>

<template>
  <div class="flex gap-2" :class="surveyCommentBandClass">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 3h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </svg>
    <span class="sr-only">運営からのコメント</span>
    <div class="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4">
      <p class="min-w-0 whitespace-pre-wrap break-words">{{ comment }}</p>
      <p v-if="updatedAt" class="ml-auto text-xs text-emerald-700/80 dark:text-emerald-400/80">
        {{ formatCommentDate(updatedAt) }}
      </p>
    </div>
  </div>
</template>
