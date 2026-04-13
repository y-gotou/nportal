<script setup lang="ts">
import { portalDescription, portalTitle } from "~~/utils/content";

useSeoMeta({
  titleTemplate: (title) => (title ? `${title} | ${portalTitle}` : portalTitle),
  description: portalDescription,
  ogTitle: portalTitle,
  ogDescription: portalDescription,
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
