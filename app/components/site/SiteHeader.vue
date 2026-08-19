<script setup lang="ts">
import { useCurrentUser } from "~/composables/useCurrentUser";

const route = useRoute();
const currentUser = useCurrentUser();
const { isDark, toggleTheme } = useTheme();

const navItems = [
  { to: "/", label: "ホーム" },
  { to: "/minutes", label: "議事録" },
  { to: "/schedule", label: "スケジュール" },
  { to: "/survey", label: "アンケート" },
  { to: "/resources", label: "資料共有" },
  { to: "/speakers", label: "発表募集" },
  { to: "/news", label: "ニュース" },
  { to: "https://nsp-channel.pages.dev/", label: "BBS", external: true },
];

const mobileMenuId = "site-mobile-navigation";
const isUserMenuOpen = ref(false);
const isMobileMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const mobileMenuButtonRef = ref<HTMLButtonElement | null>(null);

const userInitial = computed(() =>
  currentUser.value?.email?.charAt(0).toUpperCase() ?? "?",
);

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value;
}

function closeUserMenu() {
  isUserMenuOpen.value = false;
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function logout() {
  currentUser.value = null;
  closeUserMenu();
  closeMobileMenu();
  window.location.href = "/api/logout";
}

function onClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    closeUserMenu();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }

  if (isUserMenuOpen.value) {
    closeUserMenu();
    userMenuRef.value?.querySelector<HTMLElement>("button")?.focus();
  }

  if (isMobileMenuOpen.value) {
    closeMobileMenu();
    mobileMenuButtonRef.value?.focus();
  }
}

watch(() => route.fullPath, () => {
  closeUserMenu();
  closeMobileMenu();
});

watch(isMobileMenuOpen, (isOpen) => {
  if (!import.meta.client) return;
  document.body.style.overflow = isOpen ? "hidden" : "";
});

onMounted(() => {
  document.addEventListener("click", onClickOutside);
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", onClickOutside);
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
    <div
      class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6"
    >
      <div class="flex min-w-0 items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-3" translate="no">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-base font-bold text-white"
          >
            N
          </span>
          <span class="flex flex-col">
            <strong class="text-base font-semibold tracking-tight text-foreground">N Portal</strong>
          </span>
        </NuxtLink>

        <nav
          class="hidden items-center gap-2 md:flex"
          aria-label="グローバルナビゲーション"
        >
          <SiteNavLinks :items="navItems" variant="desktop" />
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <div
          v-if="currentUser"
          ref="userMenuRef"
          class="relative hidden shrink-0 border-l border-border pl-3 md:block"
        >
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :aria-expanded="isUserMenuOpen"
            aria-haspopup="true"
            @click.stop="toggleUserMenu"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              aria-hidden="true"
            >
              {{ userInitial }}
            </span>
            <span class="hidden text-xs text-muted lg:block">{{ currentUser.email }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 text-muted transition-transform"
              :class="isUserMenuOpen ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            v-if="isUserMenuOpen"
            class="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-surface py-1 shadow-lg"
            role="menu"
          >
            <div class="border-b border-border px-4 py-2.5">
              <p class="truncate text-xs font-medium text-foreground">{{ currentUser.email }}</p>
            </div>
            <SiteUserMenuItems
              variant="desktop"
              :is-admin="currentUser.isAdmin"
              :is-dark="isDark"
              @navigate="closeUserMenu"
              @toggle-theme="toggleTheme"
              @logout="logout"
            />
          </div>
        </div>

        <button
          ref="mobileMenuButtonRef"
          type="button"
          class="flex items-center justify-center rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:hidden"
          :aria-controls="mobileMenuId"
          :aria-expanded="isMobileMenuOpen"
          aria-label="メニューを開く"
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
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-border bg-surface shadow-2xl md:hidden"
      aria-label="モバイルメニュー"
    >
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <span class="text-sm font-semibold text-foreground">メニュー</span>
        <button
          type="button"
          class="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="メニューを閉じる"
          @click="closeMobileMenu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="グローバルナビゲーション（モバイル）">
        <SiteNavLinks :items="navItems" variant="mobile" @navigate="closeMobileMenu" />

        <div v-if="currentUser" class="mt-6 border-t border-border pt-6">
          <div class="flex items-center gap-3 px-4 py-2">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              aria-hidden="true"
            >
              {{ userInitial }}
            </span>
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted">ログイン中</p>
              <p class="truncate text-sm font-medium text-foreground">{{ currentUser.email }}</p>
            </div>
          </div>

          <SiteUserMenuItems
            variant="mobile"
            :is-admin="currentUser.isAdmin"
            :is-dark="isDark"
            @navigate="closeMobileMenu"
            @toggle-theme="toggleTheme"
            @logout="logout"
          />
        </div>
      </nav>
    </aside>
  </Transition>
</template>
