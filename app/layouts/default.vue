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
  <div class="site-shell">
    <SiteHeader />
    <main class="site-main">
      <slot />
    </main>
    <footer class="site-footer">
      <div class="page-container page-container--wide site-footer__inner">
        <div>
          <p class="site-footer__title">N Portal</p>
          <p class="site-footer__text">
            AI勉強会の予定、議事録、資料、アンケートをひとつにまとめた社内ポータルです。
          </p>
        </div>
        <p class="site-footer__meta">Nuxt + Cloudflare Pages</p>
      </div>
    </footer>
  </div>
</template>
