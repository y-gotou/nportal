<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="mb-10">
    <div class="rounded-2xl bg-[#2d3748] px-6 py-8 text-white md:px-8 md:py-9">
      <p
        v-if="eyebrow"
        class="mb-3 text-xs font-semibold tracking-[0.16em] text-white/70"
      >
        {{ eyebrow }}
      </p>
      <div class="max-w-3xl">
        <h1 class="text-pretty text-3xl font-bold tracking-tight md:text-4xl">{{ title }}</h1>
        <p v-if="description" class="mt-3 text-sm leading-6 text-slate-200 md:text-base">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.meta" class="mt-6">
        <slot name="meta" />
      </div>
      <div v-if="$slots.actions" class="mt-6 flex flex-wrap items-center gap-3">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>
