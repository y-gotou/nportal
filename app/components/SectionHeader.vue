<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        {{ eyebrow }}
      </p>
      <h2 class="mt-2 text-2xl font-bold tracking-tight text-slate-900">{{ title }}</h2>
      <p v-if="description" class="mt-2 text-sm leading-6 text-slate-500">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.action" class="shrink-0">
      <slot name="action" />
    </div>
  </header>
</template>
