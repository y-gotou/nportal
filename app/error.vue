<script setup lang="ts">
import type { NuxtError } from "#app";
import { portalTitle } from "#shared/utils/content";
import { errorPageContent } from "~/utils/error-page";
import { primaryButtonClass } from "~/utils/ui";

const props = defineProps<{ error: NuxtError }>();

const content = computed(() => errorPageContent(props.error.statusCode));

// エラー時はレイアウトを経由しないため、タブ名の「| N Portal」と背景色をここで指定する
useSeoMeta({ title: () => `${content.value.heading} | ${portalTitle}` });
</script>

<template>
  <main class="min-h-screen bg-background text-foreground">
    <PageContainer size="narrow">
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <p class="text-sm font-semibold tracking-[0.16em] text-muted">{{ error.statusCode }}</p>

        <div class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">
            {{ content.heading }}
          </h1>
          <p class="text-sm leading-6 text-muted">{{ content.description }}</p>
        </div>

        <!-- リンクでの移動ではエラー状態が残るため、clearError で解除して移動する -->
        <button type="button" :class="primaryButtonClass" @click="clearError({ redirect: '/' })">
          ホームへ戻る
        </button>
      </div>
    </PageContainer>
  </main>
</template>
