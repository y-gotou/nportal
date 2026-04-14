<script setup lang="ts">
import { portalDescription, portalTitle } from "~~/utils/content";
import { fetchCurrentUser } from "~/composables/useCurrentUser";

useSeoMeta({
  titleTemplate: (title) => (title ? `${title} | ${portalTitle}` : portalTitle),
  description: portalDescription,
  ogTitle: portalTitle,
  ogDescription: portalDescription,
});

// CF Access が認証を管理するため、ユーザー情報のみ取得（リダイレクトなし）
await fetchCurrentUser().catch(() => {});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <a href="#main-content" class="skip-link">本文へ移動</a>
    <SiteHeader />
    <main id="main-content" class="flex-1">
      <slot />
    </main>
  </div>
</template>
