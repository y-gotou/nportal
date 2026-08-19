<script setup lang="ts">
import type { SurveyQuestionDraftEditor } from "~/composables/useSurveyQuestionDraft";

// admin/surveys の new / edit で共用する設問編集 UI。
// ロジックは useSurveyQuestionDraft が持ち、本コンポーネントは描画のみを担う。
const props = defineProps<{
  editor: SurveyQuestionDraftEditor;
  errors: Record<string, string>;
  locked?: boolean;
  questionPlaceholder?: string;
}>();

const questions = props.editor.questions;
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-foreground">設問</h2>
      <p v-if="errors.questions" class="text-xs text-red-600">{{ errors.questions }}</p>
    </div>

    <slot name="notice" />

    <div
      v-for="(q, i) in questions"
      :key="i"
      class="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm"
    >
      <div class="flex items-start justify-between gap-3">
        <span class="shrink-0 rounded-full bg-surface-hover px-2.5 py-1 text-xs font-semibold text-muted">設問 {{ i + 1 }}</span>
        <div class="flex gap-1">
          <button
            type="button"
            class="rounded p-1 text-muted hover:bg-surface-hover disabled:opacity-30"
            :disabled="locked || i === 0"
            aria-label="上に移動"
            @click="editor.moveUp(i)"
          >
            ▲
          </button>
          <button
            type="button"
            class="rounded p-1 text-muted hover:bg-surface-hover disabled:opacity-30"
            :disabled="locked || i === questions.length - 1"
            aria-label="下に移動"
            @click="editor.moveDown(i)"
          >
            ▼
          </button>
          <button
            type="button"
            class="rounded p-1 text-red-400 hover:bg-red-50 disabled:opacity-30"
            :disabled="locked"
            aria-label="設問を削除"
            @click="editor.removeQuestion(i)"
          >
            ✕
          </button>
        </div>
      </div>

      <AdminFormField label="設問文" :field-id="`q_${i}_text`" :error="errors[`q_${i}_text`]" required>
        <input
          :id="`q_${i}_text`"
          v-model="q.questionText"
          type="text"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors[`q_${i}_text`] ? 'border-red-300' : ''"
          :placeholder="questionPlaceholder"
          :disabled="locked"
        >
      </AdminFormField>

      <AdminFormField label="回答形式" :field-id="`q_${i}_type`">
        <select
          :id="`q_${i}_type`"
          v-model="q.questionType"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :disabled="locked"
          @change="editor.handleQuestionTypeChange(q)"
        >
          <option value="single_choice">単一選択</option>
          <option value="multiple_choice">複数選択</option>
          <option value="free_text">自由記述</option>
        </select>
      </AdminFormField>

      <AdminFormField
        v-if="q.questionType !== 'free_text'"
        label="選択肢"
        :field-id="`q_${i}_options`"
        :error="errors[`q_${i}_options`]"
        required
        hint="1件ずつ編集できます。"
      >
        <div class="space-y-3">
          <div
            v-for="(option, optionIndex) in q.options"
            :key="`q-${i}-option-${optionIndex}`"
            class="flex items-center gap-2"
          >
            <input
              :id="optionIndex === 0 ? `q_${i}_options` : undefined"
              v-model="q.options[optionIndex]"
              type="text"
              class="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="errors[`q_${i}_options`] ? 'border-red-300' : ''"
              :placeholder="`選択肢 ${optionIndex + 1}`"
              :disabled="locked"
            >
            <button
              type="button"
              class="rounded p-1 text-muted hover:bg-surface-hover disabled:opacity-30"
              :disabled="locked || optionIndex === 0"
              aria-label="選択肢を上に移動"
              @click="editor.moveOptionUp(q, optionIndex)"
            >
              ▲
            </button>
            <button
              type="button"
              class="rounded p-1 text-muted hover:bg-surface-hover disabled:opacity-30"
              :disabled="locked || optionIndex === q.options.length - 1"
              aria-label="選択肢を下に移動"
              @click="editor.moveOptionDown(q, optionIndex)"
            >
              ▼
            </button>
            <button
              type="button"
              class="rounded p-1 text-red-400 hover:bg-red-50 disabled:opacity-30"
              :disabled="locked"
              aria-label="選択肢を削除"
              @click="editor.removeOption(q, optionIndex)"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            class="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
            :disabled="locked"
            @click="editor.addOption(q)"
          >
            + 選択肢を追加
          </button>
        </div>
      </AdminFormField>

      <div
        v-if="q.questionType !== 'free_text'"
        class="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
      >
        <input
          :id="`q_${i}_allow_other`"
          v-model="q.allowOtherText"
          type="checkbox"
          class="h-4 w-4 rounded border-border text-blue-500 focus:ring-blue-500"
          :disabled="locked"
        >
        <label :for="`q_${i}_allow_other`" class="text-sm font-medium text-foreground">
          「その他」の自由記述欄を追加する
        </label>
      </div>
    </div>

    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
      :disabled="locked"
      @click="editor.addQuestion()"
    >
      + 設問を追加
    </button>
  </div>
</template>
