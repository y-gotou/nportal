<script setup lang="ts">
import { portalDescription, portalTitle } from "~/utils/content";

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
    <footer class="border-t border-slate-200 bg-white">
      <div
        class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-slate-500 md:flex-row md:items-end md:justify-between md:px-6"
      >
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-900">N Portal</p>
          <p class="max-w-2xl leading-6">
            AI勉強会の予定、議事録、資料、アンケートをひとつにまとめた社内ポータルです。
          </p>
        </div>
        <p class="shrink-0 text-xs uppercase tracking-[0.24em] text-slate-400">
          Nuxt + Cloudflare Pages
        </p>
      </div>
    </footer>
  </div>
</template>
