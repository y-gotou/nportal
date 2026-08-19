<script setup lang="ts">
definePageMeta({ layout: "admin" });
await useAdminGuard();

useSeoMeta({ title: "議事録を作成" });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="議事録" parent-to="/admin/minutes" title="新規作成" />
    <AdminMinutesForm />
  </div>
</template>
