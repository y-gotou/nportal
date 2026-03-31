<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: "wide" | "medium" | "narrow";
  }>(),
  {
    size: "wide",
  },
);
</script>

<template>
  <section class="page-container" :class="`page-container--${props.size}`">
    <slot />
  </section>
</template>
