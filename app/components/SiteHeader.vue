<script setup lang="ts">
import { useCurrentUser } from "~/composables/useCurrentUser";

const route = useRoute();
const currentUser = useCurrentUser();

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

const userInitial = computed(() =>
  currentUser.value?.email?.charAt(0).toUpperCase() ?? "?",
);
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div
      class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6"
    >
      <NuxtLink to="/" class="flex items-center gap-3" translate="no">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-base font-bold text-white"
        >
          N
        </span>
        <span class="flex flex-col">
          <strong class="text-base font-semibold tracking-tight text-slate-900">N Portal</strong>
        </span>
      </NuxtLink>

      <div class="flex items-center gap-3 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
        <nav
          class="flex items-center gap-2"
          aria-label="グローバルナビゲーション"
        >
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="
              isActive(item.to)
                ? 'bg-blue-50 text-blue-600'
                : ''
            "
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div
          v-if="currentUser"
          class="shrink-0 flex items-center gap-2 border-l border-slate-200 pl-3"
          :title="currentUser.email"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
            aria-hidden="true"
          >
            {{ userInitial }}
          </span>
          <span class="hidden text-xs text-slate-500 lg:block">{{ currentUser.email }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
