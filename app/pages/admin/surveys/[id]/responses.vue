<script setup lang="ts">
import {
  buildSurveyResultBlocks,
  getSurveyStatusLabel,
  SURVEY_COMMENT_MAX_LENGTH,
} from "#shared/utils/survey";
import { surveyStatusClass } from "~/utils/status";
import { primaryButtonClass } from "~/utils/ui";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const route = useRoute();
const id = Number(route.params.id);
const { survey, responses } = await useSurveyDetail(id, {
  failureMessage: "Failed to load survey responses",
});

const canComment = survey.status === "closed";

const blocks = buildSurveyResultBlocks(survey, responses)
  .map((block, index) => ({
    ...block,
    number: index + 1,
    textAnswers: [...block.freeTextAnswers, ...block.otherTextAnswers],
  }))
  .filter((block) => block.textAnswers.length > 0);

const initialComments = Object.fromEntries(
  blocks.flatMap((block) =>
    block.textAnswers.map((answer) => [answer.responseId, answer.comment ?? ""]),
  ),
);
const drafts = reactive<Record<number, string>>({ ...initialComments });
const saved = reactive<Record<number, string>>({ ...initialComments });
const errors = reactive<Record<number, string>>({});
const savingId = ref<number | null>(null);
const lastSavedId = ref<number | null>(null);

function isDirty(responseId: number) {
  return (drafts[responseId] ?? "").trim() !== saved[responseId];
}

async function save(responseId: number) {
  const comment = (drafts[responseId] ?? "").trim();
  savingId.value = responseId;
  lastSavedId.value = null;
  errors[responseId] = "";

  try {
    await $fetch(`/api/admin/surveys/${id}/comments/${responseId}`, {
      method: "PUT",
      body: { comment },
    });
    drafts[responseId] = comment;
    saved[responseId] = comment;
    lastSavedId.value = responseId;
    clearNuxtData(surveyDetailKey(id));
  }
  catch {
    errors[responseId] = "保存に失敗しました。時間をおいて再度お試しください。";
  }
  finally {
    savingId.value = null;
  }
}

useSeoMeta({ title: `${survey.title} の回答` });
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader parent-label="アンケート" parent-to="/admin/surveys" title="回答" />

    <div class="flex flex-wrap items-center gap-3">
      <p class="font-medium text-foreground">{{ survey.title }}</p>
      <span
        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
        :class="surveyStatusClass(survey.status, { highlightDraft: true })"
      >
        {{ getSurveyStatusLabel(survey.status) }}
      </span>
      <NuxtLink
        :to="`/survey/${survey.id}/results`"
        class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        結果ページを見る
      </NuxtLink>
    </div>

    <p class="text-sm leading-6 text-muted">
      自由記述の回答にコメントを付けられます。コメントは結果ページで全員に表示されます。空にして保存すると削除されます。
    </p>

    <p
      v-if="!canComment"
      class="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
    >
      コメントは、状態が「終了」のアンケートにのみ付けられます。
    </p>

    <p
      v-if="!blocks.length"
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      自由記述の回答はまだありません。
    </p>

    <section
      v-for="block in blocks"
      :key="block.id"
      class="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <div class="space-y-1">
        <p class="text-xs font-semibold tracking-[0.16em] text-muted">Q{{ block.number }}</p>
        <h2 class="text-lg font-semibold tracking-tight text-foreground">{{ block.questionText }}</h2>
        <p v-if="block.questionType !== 'free_text'" class="text-sm text-muted">その他の自由記述</p>
      </div>

      <div
        v-for="answer in block.textAnswers"
        :key="answer.responseId"
        class="space-y-3 rounded-lg border border-border bg-background px-4 py-3"
      >
        <p class="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{{ answer.text }}</p>
        <textarea
          v-model="drafts[answer.responseId]"
          rows="2"
          aria-label="コメント"
          placeholder="コメント"
          :maxlength="SURVEY_COMMENT_MAX_LENGTH"
          :disabled="!canComment"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
        />
        <div v-if="canComment" class="flex items-center gap-3">
          <button
            type="button"
            :class="`${primaryButtonClass} disabled:opacity-50`"
            :disabled="savingId !== null || !isDirty(answer.responseId)"
            @click="save(answer.responseId)"
          >
            {{ savingId === answer.responseId ? "保存中..." : "保存" }}
          </button>
          <p v-if="errors[answer.responseId]" class="text-sm text-red-600" role="alert">
            {{ errors[answer.responseId] }}
          </p>
          <p v-else-if="lastSavedId === answer.responseId" class="text-sm text-muted" role="status">
            保存しました
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
