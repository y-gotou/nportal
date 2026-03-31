<script setup lang="ts">
const route = useRoute();

const navItems = [
  { to: "/", label: "ホーム" },
  { to: "/minutes", label: "議事録" },
  { to: "/schedule", label: "スケジュール" },
  { to: "/survey", label: "アンケート" },
  { to: "/resources", label: "資料共有" },
];

function isActive(path: string) {
  return route.path === path || (path !== "/" && route.path.startsWith(path));
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div
      class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6"
    >
      <NuxtLink to="/" class="flex items-center gap-3">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-base font-bold text-white"
        >
          N
        </span>
        <span class="flex flex-col">
          <strong class="text-base font-semibold tracking-tight text-slate-900">N Portal</strong>
          <small class="text-xs uppercase tracking-[0.24em] text-slate-500">AI Learning Hub</small>
        </span>
      </NuxtLink>

      <nav class="flex flex-wrap items-center gap-2 md:justify-end">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          :class="
            isActive(item.to)
              ? 'bg-blue-50 text-blue-600'
              : ''
          "
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
