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
  <div class="min-h-screen bg-background text-foreground">
    <a href="#main-content" class="skip-link">本文へ移動</a>
    <SiteHeader />
    <main id="main-content" class="flex-1">
      <slot />
    </main>
  </div>
</template>
