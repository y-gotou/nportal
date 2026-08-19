<script setup lang="ts">
// ユーザーメニューの項目群。デスクトップのドロップダウンとモバイルドロワーで共用し、
// 二重実装(項目 5 件 + テーマアイコン)を一本化する。アイコンはデスクトップのみ表示。
const props = defineProps<{
  variant: "desktop" | "mobile";
  isAdmin: boolean;
  isDark: boolean;
}>();

const emit = defineEmits<{
  navigate: [];
  "toggle-theme": [];
  logout: [];
}>();

const isDesktop = computed(() => props.variant === "desktop");

const desktopItemClass =
  "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

function mobileLinkClass(first = false) {
  return `${first ? "mt-4" : "mt-2"} flex items-center rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover`;
}

const linkRole = computed(() => (isDesktop.value ? "menuitem" : undefined));
</script>

<template>
  <NuxtLink
    to="/reports"
    :class="isDesktop ? desktopItemClass : mobileLinkClass(true)"
    :role="linkRole"
    @click="emit('navigate')"
  >
    <svg
      v-if="isDesktop"
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 text-muted"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H9l-4 0V6a2 2 0 012-2z" />
    </svg>
    不具合・要望報告
  </NuxtLink>

  <NuxtLink
    to="/changelog"
    :class="isDesktop ? desktopItemClass : mobileLinkClass()"
    :role="linkRole"
    @click="emit('navigate')"
  >
    <svg
      v-if="isDesktop"
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 text-muted"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
    更新情報
  </NuxtLink>

  <NuxtLink
    v-if="isAdmin"
    to="/admin"
    :class="isDesktop ? desktopItemClass : mobileLinkClass()"
    :role="linkRole"
    @click="emit('navigate')"
  >
    <svg v-if="isDesktop" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    管理画面
  </NuxtLink>

  <button
    type="button"
    :class="isDesktop
      ? desktopItemClass
      : 'mt-2 flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover'"
    :role="linkRole"
    @click="emit('toggle-theme')"
  >
    <SiteThemeIcon :dark="isDark" />
    {{ isDark ? "ライトモード" : "ダークモード" }}
  </button>

  <button
    type="button"
    :class="isDesktop
      ? desktopItemClass
      : 'mt-2 flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover'"
    :role="linkRole"
    @click="emit('logout')"
  >
    <svg
      v-if="isDesktop"
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 text-muted"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    ログアウト
  </button>
</template>
