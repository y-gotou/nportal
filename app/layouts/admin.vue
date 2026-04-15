<script setup lang="ts">
import { useCurrentUser } from "~/composables/useCurrentUser";
import { portalTitle } from "~~/utils/content";

const route = useRoute();
const currentUser = useCurrentUser();

const mobileMenuId = "admin-mobile-navigation";
const isMobileMenuOpen = ref(false);
const mobileMenuButtonRef = ref<HTMLButtonElement | null>(null);

const navItems = [
  { to: "/admin", label: "ダッシュボード", exact: true },
  { to: "/admin/minutes", label: "議事録" },
  { to: "/admin/schedule", label: "スケジュール" },
  { to: "/admin/surveys", label: "アンケート" },
  { to: "/admin/resources", label: "資料" },
  { to: "/admin/speakers", label: "発表募集" },
];

function isActive(path: string, exact = false) {
  if (exact) return route.path === path;
  return route.path === path || route.path.startsWith(path + "/");
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function logout() {
  currentUser.value = null;
  closeMobileMenu();
  window.location.href = "/api/logout";
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isMobileMenuOpen.value) {
    closeMobileMenu();
    mobileMenuButtonRef.value?.focus();
  }
}

watch(() => route.fullPath, closeMobileMenu);

watch(isMobileMenuOpen, (isOpen) => {
  if (!import.meta.client) return;
  document.body.style.overflow = isOpen ? "hidden" : "";
});

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

useSeoMeta({
  titleTemplate: (title) => (title ? `${title} | 管理 | ${portalTitle}` : `管理 | ${portalTitle}`),
});
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div class="flex h-14 items-center justify-between px-4 md:px-6">
        <NuxtLink to="/admin" class="flex items-center gap-2.5" translate="no">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">N</span>
          <span class="text-sm font-semibold text-slate-900">N Portal <span class="text-slate-400">管理</span></span>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/"
            class="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            公開サイト
          </NuxtLink>

          <div v-if="currentUser" class="hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex">
            <span class="text-xs text-slate-500">{{ currentUser.email }}</span>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              @click="logout"
            >
              ログアウト
            </button>
          </div>

          <button
            ref="mobileMenuButtonRef"
            type="button"
            class="flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:hidden"
            :aria-controls="mobileMenuId"
            :aria-expanded="isMobileMenuOpen"
            aria-label="管理メニューを開く"
            @click="toggleMobileMenu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                v-if="isMobileMenuOpen"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="flex">
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

      <main class="min-w-0 flex-1 p-4 md:p-6">
        <slot />
      </main>
    </div>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
        @click="closeMobileMenu"
      />
    </Transition>

    <Transition
      enter-active-class="transform transition duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isMobileMenuOpen"
        :id="mobileMenuId"
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-slate-200 bg-white shadow-2xl md:hidden"
        aria-label="管理メニュー（モバイル）"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <span class="text-sm font-semibold text-slate-900">管理メニュー</span>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="管理メニューを閉じる"
            @click="closeMobileMenu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="管理メニュー（モバイル）">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            :class="isActive(item.to, item.exact)
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'"
            @click="closeMobileMenu"
          >
            {{ item.label }}
          </NuxtLink>

          <div class="mt-6 border-t border-slate-200 pt-6">
            <div v-if="currentUser" class="px-4 py-2">
              <p class="text-xs font-medium text-slate-500">ログイン中</p>
              <p class="truncate text-sm font-medium text-slate-900">{{ currentUser.email }}</p>
            </div>

            <NuxtLink
              to="/"
              class="mt-4 flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              @click="closeMobileMenu"
            >
              公開サイト
            </NuxtLink>

            <button
              v-if="currentUser"
              type="button"
              class="mt-2 flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              @click="logout"
            >
              ログアウト
            </button>
          </div>
        </nav>
      </aside>
    </Transition>
  </div>
</template>
