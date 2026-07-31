<script setup lang="ts">
defineProps<{
  term: string;
  description: string;
}>();

// ホバーはタッチ端末で使えないため、タップとキーボードフォーカスでも開く
const isOpen = ref(false);
</script>

<template>
  <span class="relative inline-block">
    <button
      type="button"
      class="border-b border-dotted border-current text-blue-600 dark:text-blue-400"
      :aria-expanded="isOpen"
      @mouseenter="isOpen = true"
      @mouseleave="isOpen = false"
      @focus="isOpen = true"
      @blur="isOpen = false"
      @click="isOpen = !isOpen"
      @keydown.escape="isOpen = false"
    >
      {{ term }}
    </button>
    <span
      v-if="isOpen"
      role="tooltip"
      class="absolute left-0 top-full z-10 mt-1 block w-64 rounded-lg border border-border bg-surface p-3 text-xs leading-5 text-foreground shadow-lg"
    >
      <span class="block font-semibold">{{ term }}</span>
      <span class="mt-1 block text-muted">{{ description }}</span>
    </span>
  </span>
</template>
