import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-03-31",
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      loginDomainLabel: "",
    },
  },
  modules: ["nitro-cloudflare-dev"],
  app: {
    head: {
      script: [
        {
          innerHTML:
            "(function(){if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')})()",
          type: "text/javascript",
        },
      ],
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
  // server/utils から共有ユーティリティ(utils/chat.ts)を .ts 拡張子付きで import するため
  typescript: {
    tsConfig: {
      compilerOptions: { allowImportingTsExtensions: true },
    },
  },
  nitro: {
    preset: "cloudflare_pages",
    typescript: {
      tsConfig: {
        compilerOptions: { allowImportingTsExtensions: true },
      },
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
    "/chat/**": { prerender: false },
    "/": { prerender: false },
    "/login": { prerender: false },
  },
});
