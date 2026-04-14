<script setup lang="ts">
import type { ResourcesListResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const { data, error } = await useFetch<ResourcesListResponse>("/api/resources");
if (error.value) {
  throw createError({ statusCode: 500, statusMessage: "Failed to load resources" });
}

const item = data.value?.resources.find((r) => r.id === id);
if (!item) {
  throw createError({ statusCode: 404, statusMessage: "Resource not found" });
}

const form = reactive({
  title: item.title,
  url: item.url,
  type: item.type,
  tags: item.tags.join(", "),
  date: item.date,
  presenter: item.presenter ?? "",
  relatedMinutesSlug: item.relatedMinutesSlug ?? "",
});

const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const serverError = ref<string | null>(null);

function validate() {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  if (!form.url.trim()) e.url = "URLは必須です。";
  if (!form.type.trim()) e.type = "種類は必須です。";
  if (!form.date) e.date = "日付は必須です。";
  Object.assign(errors, e);
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  serverError.value = null;
  try {
    await $fetch(`/api/admin/resources/${id}`, {
      method: "PUT",
      body: {
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type.trim(),
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        date: form.date,
        presenter: form.presenter.trim() || null,
        relatedMinutesSlug: form.relatedMinutesSlug.trim() || null,
      },
    });
    await router.push("/admin/resources");
  }
  catch (e: unknown) {
    serverError.value = e instanceof Error ? e.message : "更新に失敗しました。";
  }
  finally {
    isSubmitting.value = false;
  }
}

useSeoMeta({ title: `${item.title} を編集` });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/resources" class="text-sm text-slate-500 hover:text-slate-700">資料</NuxtLink>
        <span class="text-slate-300">/</span>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">編集</h1>
      </div>
      <AdminDeleteButton
        :fetch-url="`/api/admin/resources/${id}`"
        redirect-to="/admin/resources"
        confirm-message="この資料を削除しますか？この操作は取り消せません。"
      />
    </div>

    <form class="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="submit">
      <p v-if="serverError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{{ serverError }}</p>

      <AdminFormField label="タイトル" field-id="title" :error="errors.title" required>
        <input
          id="title"
          v-model="form.title"
          type="text"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.title ? 'border-red-300' : ''"
        >
      </AdminFormField>

      <AdminFormField label="URL" field-id="url" :error="errors.url" required>
        <input
          id="url"
          v-model="form.url"
          type="url"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.url ? 'border-red-300' : ''"
        >
      </AdminFormField>

      <div class="grid gap-5 sm:grid-cols-2">
        <AdminFormField label="種類" field-id="type" :error="errors.type" required>
          <input
            id="type"
            v-model="form.type"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.type ? 'border-red-300' : ''"
          >
        </AdminFormField>

        <AdminFormField label="日付" field-id="date" :error="errors.date" required>
          <input
            id="date"
            v-model="form.date"
            type="date"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.date ? 'border-red-300' : ''"
          >
        </AdminFormField>
      </div>

      <AdminFormField label="タグ" field-id="tags" hint="カンマ区切り">
        <input
          id="tags"
          v-model="form.tags"
          type="text"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
      </AdminFormField>

      <div class="grid gap-5 sm:grid-cols-2">
        <AdminFormField label="発表者" field-id="presenter" hint="任意">
          <input
            id="presenter"
            v-model="form.presenter"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
        </AdminFormField>

        <AdminFormField label="関連議事録スラッグ" field-id="relatedMinutesSlug" hint="任意">
          <input
            id="relatedMinutesSlug"
            v-model="form.relatedMinutesSlug"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
        </AdminFormField>
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "更新中..." : "保存する" }}
        </button>
        <NuxtLink to="/admin/resources" class="inline-flex items-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
