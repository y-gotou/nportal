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

// ユーザーメニュー
const isMenuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function logout() {
  currentUser.value = null;
  isMenuOpen.value = false;
  window.location.href = "/api/logout";
}

// メニュー外クリックで閉じる
function onClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false;
  }
}

// Escape キーでメニューを閉じる
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isMenuOpen.value) {
    isMenuOpen.value = false;
    // トリガーボタンにフォーカスを戻す
    menuRef.value?.querySelector<HTMLElement>("button")?.focus();
  }
}

onMounted(() => {
  document.addEventListener("click", onClickOutside);
  document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  document.removeEventListener("click", onClickOutside);
  document.removeEventListener("keydown", onKeydown);
});
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
          ref="menuRef"
          class="relative shrink-0 border-l border-slate-200 pl-3"
        >
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :aria-expanded="isMenuOpen"
            aria-haspopup="true"
            @click.stop="toggleMenu"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              aria-hidden="true"
            >
              {{ userInitial }}
            </span>
            <span class="hidden text-xs text-slate-600 lg:block">{{ currentUser.email }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 text-slate-400 transition-transform"
              :class="isMenuOpen ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- ドロップダウンメニュー -->
          <div
            v-if="isMenuOpen"
            class="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            role="menu"
          >
            <div class="border-b border-slate-100 px-4 py-2.5">
              <p class="truncate text-xs font-medium text-slate-900">{{ currentUser.email }}</p>
            </div>
            <NuxtLink
              v-if="currentUser.isAdmin"
              to="/admin"
              class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              role="menuitem"
              @click="isMenuOpen = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              管理画面
            </NuxtLink>
            <button
              type="button"
              class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              role="menuitem"
              @click="logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
