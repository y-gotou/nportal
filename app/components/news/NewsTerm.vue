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
      class="cursor-help border-0 border-b border-dotted border-blue-700 bg-transparent p-0 font-[inherit] text-[inherit] leading-[inherit] text-blue-700 dark:border-blue-400 dark:text-blue-400"
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
      class="absolute left-0 top-full z-20 mt-1.5 block w-66 rounded-[10px] border border-border bg-surface px-3.5 py-3 text-left text-xs leading-[1.75] shadow-lg"
    >
      <span class="block font-bold text-foreground">{{ term }}</span>
      <span class="mt-1 block text-muted">{{ description }}</span>
    </span>
  </span>
</template>
