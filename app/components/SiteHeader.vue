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
  <header class="site-header">
    <div class="page-container page-container--wide site-header__inner">
      <NuxtLink to="/" class="site-brand">
        <span class="site-brand__mark">N</span>
        <span class="site-brand__copy">
          <strong>N Portal</strong>
          <small>AI Learning Hub</small>
        </span>
      </NuxtLink>

      <nav class="site-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="site-nav__link"
          :class="{ 'site-nav__link--active': isActive(item.to) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
