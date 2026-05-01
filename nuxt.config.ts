import tailwindcss from "@tailwindcss/vite";

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
    experimental: {
      tasks: true,
    },
    // 周期は utils/survey.ts の SURVEY_SCHEDULE_GRANULARITY_MINUTES と同期させること。
    scheduledTasks: {
      "*/15 * * * *": ["surveys:update-status"],
    },
  },
  routeRules: {
    "/api/**": { prerender: false },
    "/survey": { prerender: false },
    "/survey/**": { prerender: false },
    "/minutes": { prerender: false },
    "/minutes/**": { prerender: false },
    "/schedule": { prerender: false },
    "/resources": { prerender: false },
    "/resources/**": { prerender: false },
    "/admin/**": { prerender: false },
    "/": { prerender: false },
    "/login": { prerender: false },
  },
});
