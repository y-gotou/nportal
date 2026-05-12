<script setup lang="ts">
import type { MinutesListResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const router = useRouter();

const { data: minutesData } = await useFetch<MinutesListResponse>("/api/minutes", {
  default: () => ({ minutes: [] }),
});

const minutesOptions = computed(() => minutesData.value?.minutes ?? []);

async function handleSaved() {
  await router.push("/admin/resources");
}

useSeoMeta({ title: "資料を作成" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/admin/resources" class="text-sm text-muted hover:text-foreground">資料</NuxtLink>
      <span class="text-border">/</span>
      <h1 class="text-xl font-bold tracking-tight text-foreground">新規作成</h1>
    </div>

    <ResourceSubmissionForm
      :resource="null"
      :minutes-options="minutesOptions"
      @saved="handleSaved"
      @cancel="router.push('/admin/resources')"
    />
  </div>
</template>
