<script setup lang="ts">
// admin 配下の新規作成・編集ページ共通のパンくず付きヘッダー
defineProps<{
  parentLabel: string;
  parentTo: string;
  title: string;
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <NuxtLink :to="parentTo" class="text-sm text-muted hover:text-foreground">{{ parentLabel }}</NuxtLink>
      <span class="text-border">/</span>
      <h1 class="text-xl font-bold tracking-tight text-foreground">{{ title }}</h1>
    </div>
    <slot name="actions" />
  </div>
</template>
