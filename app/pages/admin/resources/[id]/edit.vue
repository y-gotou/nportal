<script setup lang="ts">
import type { MinutesListResponse, ResourcesListResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const { data, error } = await useFetch<ResourcesListResponse>("/api/resources");
if (error.value) {
  throw createError({ statusCode: 500, statusMessage: "Failed to load resources" });
}

const { data: minutesData } = await useFetch<MinutesListResponse>("/api/minutes", {
  default: () => ({ minutes: [] }),
});

const item = data.value?.resources.find((resource) => resource.id === id);
if (!item) {
  throw createError({ statusCode: 404, statusMessage: "Resource not found" });
}

const minutesOptions = computed(() => minutesData.value?.minutes ?? []);

async function handleSaved() {
  await router.push("/admin/resources");
}

useSeoMeta({ title: `${item.title} を編集` });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/resources" class="text-sm text-muted hover:text-foreground">資料</NuxtLink>
        <span class="text-border">/</span>
        <h1 class="text-xl font-bold tracking-tight text-foreground">編集</h1>
      </div>
      <AdminDeleteButton
        :fetch-url="`/api/admin/resources/${id}`"
        redirect-to="/admin/resources"
        confirm-message="この資料を削除しますか？この操作は取り消せません。"
      />
    </div>

    <ResourceSubmissionForm
      :resource="item"
      :minutes-options="minutesOptions"
      @saved="handleSaved"
      @cancel="router.push('/admin/resources')"
    />
  </div>
</template>
