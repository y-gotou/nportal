import { existsSync, readdirSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";

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
  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap",
        },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
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
    "/login": { prerender: false },
  },
});
