<script setup lang="ts">
definePageMeta({ layout: "admin" });
await useAdminGuard();

const router = useRouter();

const form = reactive({
  title: "",
  date: "",
  attendees: "",
  topics: "",
  contentMd: "",
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
  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(errors, e);
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  serverError.value = null;
  try {
    await $fetch("/api/admin/minutes", {
      method: "POST",
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
    serverError.value = e instanceof Error ? e.message : "作成に失敗しました。";
  }
  finally {
    isSubmitting.value = false;
  }
}

useSeoMeta({ title: "議事録を作成" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/admin/minutes" class="text-sm text-muted hover:text-foreground">議事録</NuxtLink>
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

      <AdminFormField label="発表者" field-id="attendees" :error="errors.attendees" required hint="カンマ区切りで入力（例: 田中、鈴木、佐藤）">
        <input
          id="attendees"
          v-model="form.attendees"
          type="text"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.attendees ? 'border-red-300' : ''"
          placeholder="田中, 鈴木, 佐藤"
        >
      </AdminFormField>

      <AdminFormField label="トピック" field-id="topics" :error="errors.topics" required hint="カンマ区切りで入力（例: ChatGPT, プロンプト設計）">
        <input
          id="topics"
          v-model="form.topics"
          type="text"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.topics ? 'border-red-300' : ''"
          placeholder="ChatGPT, プロンプト設計"
        >
      </AdminFormField>

      <AdminFormField label="本文（Markdown）" field-id="contentMd">
        <textarea
          id="contentMd"
          v-model="form.contentMd"
          rows="16"
          class="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="## 議題&#10;&#10;- ..."
        />
      </AdminFormField>

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "作成中..." : "作成する" }}
        </button>
        <NuxtLink to="/admin/minutes" class="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
