<script setup lang="ts">
const widths = {
  wide: "max-w-6xl",
  medium: "max-w-4xl",
  narrow: "max-w-3xl",
} as const;

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
  <section
    class="mx-auto w-full px-4 py-8 md:px-6 md:py-10"
    :class="widths[props.size]"
  >
    <slot />
  </section>
</template>
