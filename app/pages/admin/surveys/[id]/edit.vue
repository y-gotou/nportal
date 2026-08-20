<script setup lang="ts">
import type { SurveyGetResponse, SurveyStatus } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const { data, error } = await useFetch<SurveyGetResponse>("/api/survey", { query: { surveyId: id } });
if (error.value || !data.value?.survey) {
  throw createError({ statusCode: 404, statusMessage: "Survey not found" });
}

const survey = data.value.survey;
const isQuestionEditingLocked = computed(() => (survey.responseCount ?? 0) > 0);

const form = reactive({
  title: survey.title,
  description: survey.description,
  status: survey.status as SurveyStatus,
});

const editor = useSurveyQuestionDraft({
  initial: survey.questions,
  locked: isQuestionEditingLocked,
});

const { errors, isSubmitting, serverError, applyErrors, submitWith } = useAdminForm("更新に失敗しました。");

function validate() {
  const e: Record<string, string> = editor.validateQuestions();
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  return applyErrors(e);
}

async function submit() {
  if (!validate()) return;
  await submitWith(async () => {
    await $fetch(`/api/admin/surveys/${id}`, {
      method: "PUT",
      body: {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
      },
    });

    if (!isQuestionEditingLocked.value) {
      await $fetch(`/api/admin/surveys/${id}/questions`, {
        method: "PUT",
        body: { questions: editor.toRequestBody() },
      });
    }

    await router.push("/admin/surveys");
  });
}

useSeoMeta({ title: `${survey.title} を編集` });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="アンケート" parent-to="/admin/surveys" title="編集">
      <template #actions>
        <AdminDeleteButton
          :fetch-url="`/api/admin/surveys/${id}`"
          redirect-to="/admin/surveys"
          confirm-message="このアンケートと全ての回答を削除しますか？この操作は取り消せません。"
        />
      </template>
    </AdminPageHeader>

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
          >
        </AdminFormField>

        <AdminFormField label="説明" field-id="description">
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        :locked="isQuestionEditingLocked"
      >
        <template #notice>
          <p
            v-if="isQuestionEditingLocked"
            class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
          >
            回答済みのアンケートは設問を編集できません。基本情報と状態のみ更新できます。設問変更が必要な場合は、新しいアンケートを作成してください。
          </p>
        </template>
      </AdminSurveyQuestionEditor>

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "更新中..." : "保存する" }}
        </button>
        <NuxtLink to="/admin/surveys" class="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
