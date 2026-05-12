<script setup lang="ts">
definePageMeta({ layout: "admin" });
await useAdminGuard();

const router = useRouter();

const form = reactive({
  date: "",
  time: "",
  title: "",
  location: "",
  meetingUrl: "",
  topics: "",
});

const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const serverError = ref<string | null>(null);

function validate() {
  const e: Record<string, string> = {};
  if (!form.date) e.date = "開催日は必須です。";
  if (!form.time) e.time = "開催時間は必須です。";
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(errors, e);
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  serverError.value = null;
  try {
    await $fetch("/api/admin/schedule", {
      method: "POST",
      body: {
        date: form.date,
        time: form.time,
        title: form.title.trim(),
        location: form.location.trim() || null,
        meetingUrl: form.meetingUrl.trim() || null,
        topics: form.topics.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    await router.push("/admin/schedule");
  }
  catch (e: unknown) {
    serverError.value = e instanceof Error ? e.message : "作成に失敗しました。";
  }
  finally {
    isSubmitting.value = false;
  }
}

useSeoMeta({ title: "スケジュールを作成" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/admin/schedule" class="text-sm text-muted hover:text-foreground">スケジュール</NuxtLink>
      <span class="text-border">/</span>
      <h1 class="text-xl font-bold tracking-tight text-foreground">新規作成</h1>
    </div>

    <form class="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm" @submit.prevent="submit">
      <p v-if="serverError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{{ serverError }}</p>

      <div class="grid gap-5 sm:grid-cols-2">
        <AdminFormField label="開催日" field-id="date" :error="errors.date" required>
          <input
            id="date"
            v-model="form.date"
            type="date"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.date ? 'border-red-300' : ''"
          >
        </AdminFormField>

        <AdminFormField label="開催時間" field-id="time" :error="errors.time" required>
          <input
            id="time"
            v-model="form.time"
            type="time"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.time ? 'border-red-300' : ''"
          >
        </AdminFormField>
      </div>

      <AdminFormField label="タイトル" field-id="title" :error="errors.title" required>
        <input
          id="title"
          v-model="form.title"
          type="text"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.title ? 'border-red-300' : ''"
          placeholder="第1回 社内AI勉強会"
        >
      </AdminFormField>

      <AdminFormField label="トピック" field-id="topics" hint="カンマ区切り（例: ChatGPT, プロンプト設計）">
        <input
          id="topics"
          v-model="form.topics"
          type="text"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="ChatGPT, プロンプト設計"
        >
      </AdminFormField>

      <AdminFormField label="開催場所" field-id="location" hint="任意">
        <input
          id="location"
          v-model="form.location"
          type="text"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="会議室A / オンライン"
        >
      </AdminFormField>

      <AdminFormField label="会議URL" field-id="meetingUrl" hint="任意（Zoom / Teams など）">
        <input
          id="meetingUrl"
          v-model="form.meetingUrl"
          type="url"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="https://..."
        >
      </AdminFormField>

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "作成中..." : "作成する" }}
        </button>
        <NuxtLink to="/admin/schedule" class="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
