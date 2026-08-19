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
    <AdminPageHeader parent-label="資料" parent-to="/admin/resources" title="新規作成" />

    <ResourceSubmissionForm
      :resource="null"
      :minutes-options="minutesOptions"
      @saved="handleSaved"
      @cancel="router.push('/admin/resources')"
    />
  </div>
</template>
