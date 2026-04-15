<script setup lang="ts">
import type { MinutesDetailResponse } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const router = useRouter();
const slug = String(route.params.slug);

const { data, error } = await useFetch<MinutesDetailResponse>("/api/minute", { query: { slug } });

if (error.value || !data.value?.minutes) {
  throw createError({ statusCode: 404, statusMessage: "Minutes not found" });
}

const minutes = data.value.minutes;

const form = reactive({
  title: minutes.title,
  date: minutes.date,
  attendees: minutes.attendees.join(", "),
  topics: minutes.topics.join(", "),
  contentMd: minutes.contentMd,
});

const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const serverError = ref<string | null>(null);

function validate() {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  if (!form.date) e.date = "開催日は必須です。";
  if (!form.attendees.trim()) e.attendees = "発表者は必須です。";
  if (!form.topics.trim()) e.topics = "トピックは必須です。";
  Object.assign(errors, e);
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  serverError.value = null;
  try {
    await $fetch(`/api/admin/minutes/${slug}`, {
      method: "PUT",
      body: {
        title: form.title.trim(),
        date: form.date,
        attendees: form.attendees.split(",").map((s) => s.trim()).filter(Boolean),
        topics: form.topics.split(",").map((s) => s.trim()).filter(Boolean),
        contentMd: form.contentMd,
      },
    });
    await router.push("/admin/minutes");
  }
  catch (e: unknown) {
    serverError.value = e instanceof Error ? e.message : "更新に失敗しました。";
  }
  finally {
    isSubmitting.value = false;
  }
}

useSeoMeta({ title: `${minutes.title} を編集` });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/minutes" class="text-sm text-slate-500 hover:text-slate-700">議事録</NuxtLink>
        <span class="text-slate-300">/</span>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">編集</h1>
      </div>
      <AdminDeleteButton
        :fetch-url="`/api/admin/minutes/${slug}`"
        redirect-to="/admin/minutes"
        confirm-message="この議事録を削除しますか？この操作は取り消せません。"
      />
    </div>

    <form class="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="submit">
      <p v-if="serverError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{{ serverError }}</p>

      <div class="grid gap-5 sm:grid-cols-2">
        <AdminFormField label="スラッグ" field-id="slug-display">
          <input
            id="slug-display"
            :value="slug"
            type="text"
            class="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            disabled
          >
        </AdminFormField>

        <AdminFormField label="開催日" field-id="date" :error="errors.date" required>
          <input
            id="date"
            v-model="form.date"
            type="date"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.date ? 'border-red-300' : ''"
          >
        </AdminFormField>
      </div>

      <AdminFormField label="タイトル" field-id="title" :error="errors.title" required>
        <input
          id="title"
          v-model="form.title"
          type="text"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.title ? 'border-red-300' : ''"
        >
      </AdminFormField>

      <AdminFormField label="発表者" field-id="attendees" :error="errors.attendees" required hint="カンマ区切り">
        <input
          id="attendees"
          v-model="form.attendees"
          type="text"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.attendees ? 'border-red-300' : ''"
        >
      </AdminFormField>

      <AdminFormField label="トピック" field-id="topics" :error="errors.topics" required hint="カンマ区切り">
        <input
          id="topics"
          v-model="form.topics"
          type="text"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.topics ? 'border-red-300' : ''"
        >
      </AdminFormField>

      <AdminFormField label="本文（Markdown）" field-id="contentMd">
        <textarea
          id="contentMd"
          v-model="form.contentMd"
          rows="16"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </AdminFormField>

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "更新中..." : "保存する" }}
        </button>
        <NuxtLink to="/admin/minutes" class="inline-flex items-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
