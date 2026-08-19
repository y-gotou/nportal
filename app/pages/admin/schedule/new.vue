<script setup lang="ts">
definePageMeta({ layout: "admin" });
await useAdminGuard();

useSeoMeta({ title: "スケジュールを作成" });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="スケジュール" parent-to="/admin/schedule" title="新規作成" />
    <AdminScheduleForm />
  </div>
</template>
