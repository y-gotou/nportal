<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="hero-panel">
    <p class="eyebrow eyebrow--light">{{ eyebrow }}</p>
    <h1 class="hero-panel__title">{{ title }}</h1>
    <p v-if="description" class="hero-panel__description">
      {{ description }}
    </p>
    <div v-if="$slots.meta" class="hero-panel__meta">
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="hero-panel__actions">
      <slot name="actions" />
    </div>
  </section>
</template>
