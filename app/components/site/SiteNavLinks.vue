<script setup lang="ts">
// グローバルナビゲーションのリンク群。デスクトップ/モバイルで配色・余白のみ異なる。
const props = defineProps<{
  items: Array<{ to: string; label: string; external?: boolean }>;
  variant: "desktop" | "mobile";
}>();

const emit = defineEmits<{ navigate: [] }>();

const route = useRoute();

function isActive(path: string) {
  return route.path === path || (path !== "/" && route.path.startsWith(path));
}

const linkClass = computed(() =>
  props.variant === "desktop"
    ? "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    : "flex items-center rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover",
);
</script>

<template>
  <NuxtLink
    v-for="item in items"
    :key="item.to"
    :to="item.to"
    :target="item.external ? '_blank' : undefined"
    :rel="item.external ? 'noopener noreferrer' : undefined"
    :class="[linkClass, isActive(item.to) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : '']"
    @click="emit('navigate')"
  >
    {{ item.label }}
  </NuxtLink>
</template>
