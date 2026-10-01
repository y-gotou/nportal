<script setup lang="ts">
defineProps<{
  agenda?: string | null;
}>();
</script>

<template>
  <!-- 配色は currentColor 基準。明色のカードと暗色のヒーローの双方に置くため、文字色は親から class で指定する -->
  <details v-if="agenda" class="group text-sm">
    <summary
      class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-current/25 px-3 py-1.5 font-medium transition-colors hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 transition-transform group-open:rotate-90"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
      </svg>
      議題
    </summary>
    <p class="mt-3 whitespace-pre-wrap border-l-2 border-current/25 pl-3 leading-6">{{ agenda }}</p>
  </details>
</template>
