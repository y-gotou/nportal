<script setup lang="ts">
import type { ScheduleListResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const id = Number(route.params.id);

const { data, error } = await useFetch<ScheduleListResponse>("/api/schedule");
if (error.value) {
  throw createError({ statusCode: 500, statusMessage: "Failed to load schedule" });
}

const item = data.value?.schedule.find((s) => s.id === id);
if (!item) {
  throw createError({ statusCode: 404, statusMessage: "Schedule item not found" });
}

useSeoMeta({ title: `${item.title} を編集` });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="スケジュール" parent-to="/admin/schedule" title="編集">
      <template #actions>
        <AdminDeleteButton
          :fetch-url="`/api/admin/schedule/${id}`"
          redirect-to="/admin/schedule"
          confirm-message="このスケジュールを削除しますか？この操作は取り消せません。"
        />
      </template>
    </AdminPageHeader>
    <AdminScheduleForm :item="item" />
  </div>
</template>
