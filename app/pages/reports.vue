<script setup lang="ts">
import type { CreateReportInput, ReportType } from "~~/types/portal";
import { primaryButtonClass, secondaryButtonClass, surfaceCardClass } from "~/utils/ui";

const form = reactive<CreateReportInput>({
  reportType: "bug",
  title: "",
  detail: "",
});

const errors = reactive({
  title: "",
  detail: "",
});

const isSubmitting = ref(false);
const submitError = ref("");
const isSubmitted = ref(false);

const typeOptions: Array<{ value: ReportType; label: string }> = [
  { value: "bug", label: "不具合" },
  { value: "request", label: "要望" },
];

function resetMessages() {
  submitError.value = "";
}

function validate() {
  errors.title = "";
  errors.detail = "";

  if (!form.title.trim()) {
    errors.title = "件名は必須です。";
  }

  if (!form.detail.trim()) {
    errors.detail = "詳細は必須です。";
  }

  return !errors.title && !errors.detail;
}

async function submit() {
  resetMessages();

  if (!validate()) {
    return;
  }

  isSubmitting.value = true;

  try {
    await $fetch("/api/reports", {
      method: "POST",
      body: {
        reportType: form.reportType,
        title: form.title.trim(),
        detail: form.detail.trim(),
      },
    });

    isSubmitted.value = true;
  } catch (error: unknown) {
    submitError.value = error instanceof Error ? error.message : "送信に失敗しました。";
  } finally {
    isSubmitting.value = false;
  }
}

useSeoMeta({
  title: "不具合・要望報告",
  description: "N Portal に関する不具合や要望を管理者へ報告できます。",
});
</script>

<template>
  <PageContainer size="medium">
    <div v-if="isSubmitted" class="space-y-6">
      <div :class="surfaceCardClass" class="space-y-4">
        <p class="text-lg font-semibold text-slate-900">ご報告ありがとうございます。内容を確認のうえ対応します。</p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/" :class="secondaryButtonClass">
            <IconArrowLeft />
            ホームへ戻る
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div class="mb-4 flex flex-wrap gap-3">
        <NuxtLink to="/" :class="secondaryButtonClass">
          <IconArrowLeft />
          ホームへ戻る
        </NuxtLink>
      </div>

      <SectionHeader title="不具合・要望報告" />

      <div :class="surfaceCardClass" class="space-y-6">
        <form class="space-y-6" @submit.prevent="submit">
          <div>
            <label for="report-type" class="block text-sm font-medium text-slate-900">
              種別 <span class="text-red-500">*</span>
            </label>
            <select
              id="report-type"
              v-model="form.reportType"
              class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option
                v-for="option in typeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label for="report-title" class="block text-sm font-medium text-slate-900">
              件名 <span class="text-red-500">*</span>
            </label>
            <input
              id="report-title"
              v-model="form.title"
              type="text"
              class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="例: 議事録詳細ページで表示が崩れる"
            >
            <p v-if="errors.title" class="mt-1 text-sm text-red-600" role="alert">{{ errors.title }}</p>
          </div>

          <div>
            <label for="report-detail" class="block text-sm font-medium text-slate-900">
              詳細 <span class="text-red-500">*</span>
            </label>
            <textarea
              id="report-detail"
              v-model="form.detail"
              rows="8"
              class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="発生した画面、状況、期待した動作などを記載してください。"
            />
            <p v-if="errors.detail" class="mt-1 text-sm text-red-600" role="alert">{{ errors.detail }}</p>
          </div>

          <div
            v-if="submitError"
            class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {{ submitError }}
          </div>

          <div class="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              :class="primaryButtonClass"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? "送信中..." : "送信する" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </PageContainer>
</template>
