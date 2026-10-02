<script setup lang="ts">
import type { SurveyTextAnswer as TextAnswer } from "~~/types/portal";
import { SURVEY_COMMENT_MAX_LENGTH } from "#shared/utils/survey";
import { surveyCommentBandClass } from "~/utils/survey";

const props = defineProps<{
  surveyId: number;
  answer: TextAnswer;
  isMine: boolean;
  canComment: boolean;
}>();

const comment = ref(props.answer.comment ?? "");
const updatedAt = ref(props.answer.commentUpdatedAt);
const draft = ref("");
const isOpen = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const buttonRef = ref<HTMLButtonElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const buttonLabel = computed(() => {
  if (isOpen.value) return "コメントを保存";
  return comment.value ? "コメントを編集" : "コメントする";
});

async function open() {
  draft.value = comment.value;
  errorMessage.value = "";
  isOpen.value = true;
  await nextTick();
  textareaRef.value?.focus();
}

function cancel(event: KeyboardEvent) {
  // 日本語入力の変換を取り消す Esc では閉じない
  if (event.isComposing) return;
  isOpen.value = false;
  buttonRef.value?.focus();
}

async function save() {
  const text = draft.value.trim();

  if (text === comment.value) {
    isOpen.value = false;
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  try {
    await $fetch(`/api/admin/surveys/${props.surveyId}/comments/${props.answer.responseId}`, {
      method: "PUT",
      body: { comment: text },
    });
    comment.value = text;
    updatedAt.value = new Date().toISOString();
    isOpen.value = false;
    clearNuxtData(surveyDetailKey(props.surveyId));
  }
  catch {
    errorMessage.value = "保存に失敗しました。時間をおいて再度お試しください。";
  }
  finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border text-sm leading-6"
    :class="
      isMine
        ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
        : 'border-border bg-background text-foreground'
    "
  >
    <div class="flex items-start gap-2 px-4 py-3">
      <div class="min-w-0 flex-1">
        <span
          v-if="isMine"
          class="mb-1 block text-xs font-semibold text-blue-600 dark:text-blue-400"
        >あなたの回答</span>
        <p class="whitespace-pre-wrap break-words">{{ answer.text }}</p>
      </div>
      <button
        v-if="canComment"
        ref="buttonRef"
        type="button"
        class="-my-1 -mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        :class="isOpen ? 'bg-surface-hover text-foreground' : ''"
        :aria-expanded="isOpen"
        :aria-label="buttonLabel"
        :title="buttonLabel"
        :disabled="isSaving"
        @click="isOpen ? save() : open()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4 3h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        </svg>
      </button>
    </div>

    <div v-if="isOpen" :class="surveyCommentBandClass">
      <textarea
        ref="textareaRef"
        v-model="draft"
        rows="2"
        aria-label="コメント"
        placeholder="コメント"
        :maxlength="SURVEY_COMMENT_MAX_LENGTH"
        class="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @keydown.esc="cancel"
      />
      <p v-if="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
        {{ errorMessage }}
      </p>
    </div>
    <SurveyAnswerComment v-else-if="comment" :comment="comment" :updated-at="updatedAt" />
  </div>
</template>
