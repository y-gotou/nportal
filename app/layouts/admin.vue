<script setup lang="ts">
import { useCurrentUser } from "~/composables/useCurrentUser";
import { portalTitle } from "~~/utils/content";

const route = useRoute();
const currentUser = useCurrentUser();
const isMenuOpen = ref(false);

const navItems = [
  { to: "/admin", label: "ダッシュボード", exact: true },
  { to: "/admin/minutes", label: "議事録" },
  { to: "/admin/schedule", label: "スケジュール" },
  { to: "/admin/surveys", label: "アンケート" },
  { to: "/admin/resources", label: "資料" },
];

function isActive(path: string, exact = false) {
  if (exact) return route.path === path;
  return route.path === path || route.path.startsWith(path + "/");
}

function logout() {
  currentUser.value = null;
  window.location.href = "/api/logout";
}

useSeoMeta({
  titleTemplate: (title) => (title ? `${title} | 管理 | ${portalTitle}` : `管理 | ${portalTitle}`),
});
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <!-- ヘッダー -->
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div class="flex h-14 items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-3">
          <!-- モバイル: ハンバーガー -->
          <button
            type="button"
            class="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            :aria-expanded="isMenuOpen"
            aria-label="メニューを開く"
            @click="isMenuOpen = !isMenuOpen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="isMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <NuxtLink to="/admin" class="flex items-center gap-2.5" translate="no">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">N</span>
            <span class="text-sm font-semibold text-slate-900">N Portal <span class="text-slate-400">管理</span></span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/"
            class="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            公開サイト
          </NuxtLink>

          <div v-if="currentUser" class="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span class="hidden text-xs text-slate-500 sm:block">{{ currentUser.email }}</span>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              @click="logout"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- サイドバー（デスクトップ） -->
      <aside class="hidden w-52 shrink-0 md:block">
        <nav class="sticky top-14 space-y-1 p-4" aria-label="管理メニュー">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="isActive(item.to, item.exact)
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </aside>

      <!-- モバイルメニュー（オーバーレイ） -->
      <div
        v-if="isMenuOpen"
        class="fixed inset-0 z-30 md:hidden"
        @click="isMenuOpen = false"
      >
        <div class="absolute inset-0 bg-black/30" />
        <nav
          class="absolute left-0 top-14 bottom-0 w-52 space-y-1 overflow-y-auto bg-white p-4 shadow-xl"
          aria-label="管理メニュー（モバイル）"
          @click.stop
        >
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="isActive(item.to, item.exact)
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
            @click="isMenuOpen = false"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <!-- メインコンテンツ -->
      <main class="min-w-0 flex-1 p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
