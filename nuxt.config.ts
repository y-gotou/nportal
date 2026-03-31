import { existsSync, readdirSync } from "node:fs";

const minutesDir = new URL("./content/minutes/", import.meta.url);
const minutesRoutes = existsSync(minutesDir)
  ? readdirSync(minutesDir)
      .filter((file) => file.endsWith(".md"))
      .map((file) => `/minutes/${file.replace(/\.md$/, "")}`)
  : [];

export default defineNuxtConfig({
  compatibilityDate: "2026-03-31",
  devtools: { enabled: false },
  modules: ["nitro-cloudflare-dev"],
  css: ["~/assets/css/main.css"],
  nitro: {
    preset: "cloudflare_pages",
    prerender: {
      routes: ["/", "/minutes", "/schedule", "/resources", ...minutesRoutes],
    },
  },
  routeRules: {
    "/api/**": { prerender: false },
    "/survey": { prerender: false },
    "/survey/**": { prerender: false },
  },
});
