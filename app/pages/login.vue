<script setup lang="ts">
useSeoMeta({
  title: "ログインが必要です",
});
</script>

<template>
  <PageContainer size="narrow">
    <div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          ログインが必要です
        </h1>
        <p class="text-sm leading-6 text-slate-500">
          N Portal は社内メンバー限定のサービスです。<br>
          アクセスするには @d2sol.co.jp アカウントでのログインが必要です。
        </p>
      </div>

      <NuxtLink
        to="/"
        class="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        ホームへ戻る
      </NuxtLink>
    </div>
  </PageContainer>
</template>
