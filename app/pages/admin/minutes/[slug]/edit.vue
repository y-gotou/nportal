<script setup lang="ts">
import type { MinutesDetailResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const slug = String(route.params.slug);

const { data, error } = await useFetch<MinutesDetailResponse>("/api/minute", { query: { slug } });

if (error.value || !data.value?.minutes) {
  throw createError({ statusCode: 404, statusMessage: "Minutes not found" });
}

const minutes = data.value.minutes;

useSeoMeta({ title: `${minutes.title} を編集` });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="議事録" parent-to="/admin/minutes" title="編集">
      <template #actions>
        <AdminDeleteButton
          :fetch-url="`/api/admin/minutes/${slug}`"
          redirect-to="/admin/minutes"
          confirm-message="この議事録を削除しますか？この操作は取り消せません。"
        />
      </template>
    </AdminPageHeader>
    <AdminMinutesForm :minutes="minutes" />
  </div>
</template>
