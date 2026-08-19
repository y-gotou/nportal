<script setup lang="ts">
import type { SurveyStatus } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const router = useRouter();

const form = reactive({
  title: "",
  description: "",
  status: "draft" as SurveyStatus,
});

const editor = useSurveyQuestionDraft();

const { errors, isSubmitting, serverError, applyErrors, submitWith } = useAdminForm("作成に失敗しました。");

function validate() {
  const e: Record<string, string> = editor.validateQuestions();
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  return applyErrors(e);
}

async function submit() {
  if (!validate()) return;
  await submitWith(async () => {
    await $fetch("/api/admin/surveys", {
      method: "POST",
      body: {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        questions: editor.toRequestBody(),
      },
    });
    await router.push("/admin/surveys");
  });
}

useSeoMeta({ title: "アンケートを作成" });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="アンケート" parent-to="/admin/surveys" title="新規作成" />

    <form class="space-y-6" @submit.prevent="submit">
      <p v-if="serverError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{{ serverError }}</p>

      <!-- 基本情報 -->
      <div class="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 class="text-sm font-semibold text-foreground">基本情報</h2>

        <AdminFormField label="タイトル" field-id="title" :error="errors.title" required>
          <input
            id="title"
            v-model="form.title"
            type="text"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.title ? 'border-red-300' : ''"
            placeholder="第1回 勉強会アンケート"
          >
        </AdminFormField>

        <AdminFormField label="説明" field-id="description">
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="アンケートの目的や注意事項"
          />
        </AdminFormField>

        <AdminFormField label="状態" field-id="status">
          <select
            id="status"
            v-model="form.status"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="draft">下書き</option>
            <option value="active">受付中</option>
            <option value="closed">受付終了</option>
          </select>
        </AdminFormField>
      </div>

      <!-- 設問 -->
      <AdminSurveyQuestionEditor
        :editor="editor"
        :errors="errors"
        question-placeholder="質問の内容を入力"
      />

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "作成中..." : "作成する" }}
        </button>
        <NuxtLink to="/admin/surveys" class="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
