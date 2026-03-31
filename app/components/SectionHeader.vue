<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="section-header">
    <div>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h2 class="section-header__title">{{ title }}</h2>
      <p v-if="description" class="section-header__description">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.action" class="section-header__action">
      <slot name="action" />
    </div>
  </header>
</template>
