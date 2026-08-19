<script setup lang="ts">
import type { Minutes } from "~~/types/portal";

// admin/minutes の new / edit で共用するフォーム。minutes を渡すと編集モードになる。
const props = defineProps<{
  minutes?: Minutes | null;
}>();

const router = useRouter();
const isEdit = computed(() => Boolean(props.minutes));

const form = reactive({
  title: props.minutes?.title ?? "",
  date: props.minutes?.date ?? "",
  attendees: props.minutes?.attendees.join(", ") ?? "",
  topics: props.minutes?.topics.join(", ") ?? "",
  contentMd: props.minutes?.contentMd ?? "",
});

const { errors, isSubmitting, serverError, applyErrors, submitWith } = useAdminForm(
  props.minutes ? "更新に失敗しました。" : "作成に失敗しました。",
);

function validate() {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  if (!form.date) e.date = "開催日は必須です。";
  if (!form.attendees.trim()) e.attendees = "発表者は必須です。";
  if (!form.topics.trim()) e.topics = "トピックは必須です。";
  return applyErrors(e);
}

async function submit() {
  if (!validate()) return;
  await submitWith(async () => {
    await $fetch(props.minutes ? `/api/admin/minutes/${props.minutes.slug}` : "/api/admin/minutes", {
      method: props.minutes ? "PUT" : "POST",
      body: {
        title: form.title.trim(),
        date: form.date,
        attendees: form.attendees.split(",").map((s) => s.trim()).filter(Boolean),
        topics: form.topics.split(",").map((s) => s.trim()).filter(Boolean),
        contentMd: form.contentMd,
      },
    });
    await router.push("/admin/minutes");
  });
}
</script>

<template>
  <form class="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm" @submit.prevent="submit">
    <p v-if="serverError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{{ serverError }}</p>

    <div class="grid gap-5 sm:grid-cols-2">
      <AdminFormField v-if="minutes" label="スラッグ" field-id="slug-display">
        <input
          id="slug-display"
          :value="minutes.slug"
          type="text"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted"
          disabled
        >
      </AdminFormField>

      <AdminFormField label="開催日" field-id="date" :error="errors.date" required>
        <!-- 開催日はスラッグの元のため編集時は変更不可 -->
        <input
          id="date"
          v-model="form.date"
          type="date"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm"
          :class="[
            isEdit
              ? 'bg-background text-muted'
              : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            errors.date ? 'border-red-300' : '',
          ]"
          :disabled="isEdit"
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
        :placeholder="isEdit ? undefined : '第1回 社内AI勉強会'"
      >
    </AdminFormField>

    <AdminFormField
      label="発表者"
      field-id="attendees"
      :error="errors.attendees"
      required
      :hint="isEdit ? 'カンマ区切り' : 'カンマ区切りで入力（例: 田中、鈴木、佐藤）'"
    >
      <input
        id="attendees"
        v-model="form.attendees"
        type="text"
        class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="errors.attendees ? 'border-red-300' : ''"
        :placeholder="isEdit ? undefined : '田中, 鈴木, 佐藤'"
      >
    </AdminFormField>

    <AdminFormField
      label="トピック"
      field-id="topics"
      :error="errors.topics"
      required
      :hint="isEdit ? 'カンマ区切り' : 'カンマ区切りで入力（例: ChatGPT, プロンプト設計）'"
    >
      <input
        id="topics"
        v-model="form.topics"
        type="text"
        class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="errors.topics ? 'border-red-300' : ''"
        :placeholder="isEdit ? undefined : 'ChatGPT, プロンプト設計'"
      >
    </AdminFormField>

    <AdminFormField label="本文（Markdown）" field-id="contentMd">
      <textarea
        id="contentMd"
        v-model="form.contentMd"
        rows="16"
        class="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :placeholder="isEdit ? undefined : '## 議題\n\n- ...'"
      />
    </AdminFormField>

    <div class="flex gap-3">
      <button
        type="submit"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        :disabled="isSubmitting"
      >
        {{ isEdit ? (isSubmitting ? "更新中..." : "保存する") : (isSubmitting ? "作成中..." : "作成する") }}
      </button>
      <NuxtLink to="/admin/minutes" class="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover">
        キャンセル
      </NuxtLink>
    </div>
  </form>
</template>
