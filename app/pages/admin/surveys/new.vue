<script setup lang="ts">
import type { SurveyQuestionType } from "~~/types/portal";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const router = useRouter();

const form = reactive({
  title: "",
  description: "",
  isActive: true,
});

interface QuestionDraft {
  questionText: string;
  questionType: SurveyQuestionType;
  options: string[];
  allowOtherText: boolean;
}

const questions = ref<QuestionDraft[]>([
  { questionText: "", questionType: "single_choice", options: [""], allowOtherText: false },
]);

function addQuestion() {
  questions.value.push({
    questionText: "",
    questionType: "single_choice",
    options: [""],
    allowOtherText: false,
  });
}

function removeQuestion(index: number) {
  questions.value.splice(index, 1);
}

function moveUp(index: number) {
  if (index === 0) return;
  const arr = questions.value;
  const prev = arr[index - 1]!;
  const curr = arr[index]!;
  arr.splice(index - 1, 2, curr, prev);
}

function moveDown(index: number) {
  const arr = questions.value;
  if (index === arr.length - 1) return;
  const curr = arr[index]!;
  const next = arr[index + 1]!;
  arr.splice(index, 2, next, curr);
}

function addOption(question: QuestionDraft) {
  question.options.push("");
}

function removeOption(question: QuestionDraft, optionIndex: number) {
  question.options.splice(optionIndex, 1);
}

function moveOptionUp(question: QuestionDraft, optionIndex: number) {
  if (optionIndex === 0) return;
  const options = question.options;
  const previous = options[optionIndex - 1]!;
  const current = options[optionIndex]!;
  options.splice(optionIndex - 1, 2, current, previous);
}

function moveOptionDown(question: QuestionDraft, optionIndex: number) {
  if (optionIndex === question.options.length - 1) return;
  const options = question.options;
  const current = options[optionIndex]!;
  const next = options[optionIndex + 1]!;
  options.splice(optionIndex, 2, next, current);
}

function handleQuestionTypeChange(question: QuestionDraft) {
  if (question.questionType === "free_text") {
    question.allowOtherText = false;
    return;
  }

  if (question.options.length === 0) {
    question.options.push("");
  }
}

function normalizeOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const serverError = ref<string | null>(null);

function validate() {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = "タイトルは必須です。";
  if (questions.value.length === 0) e.questions = "設問を1つ以上追加してください。";
  questions.value.forEach((q, i) => {
    if (!q.questionText.trim()) e[`q_${i}_text`] = `設問${i + 1}の文章は必須です。`;
    if (q.questionType !== "free_text") {
      const normalizedOptions = normalizeOptions(q.options);
      if (normalizedOptions.length === 0) {
        e[`q_${i}_options`] = `設問${i + 1}の選択肢は1件以上必要です。`;
      } else if (normalizedOptions.length !== q.options.length) {
        e[`q_${i}_options`] = `設問${i + 1}に空の選択肢があります。`;
      }
    }
  });
  Object.assign(errors, e);
  return Object.keys(e).length === 0;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  serverError.value = null;
  try {
    await $fetch("/api/admin/surveys", {
      method: "POST",
      body: {
        title: form.title.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        questions: questions.value.map((q) => ({
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          options: q.questionType !== "free_text" ? normalizeOptions(q.options) : [],
          allowOtherText: q.questionType !== "free_text" && q.allowOtherText,
        })),
      },
    });
    await router.push("/admin/surveys");
  }
  catch (e: unknown) {
    serverError.value = e instanceof Error ? e.message : "作成に失敗しました。";
  }
  finally {
    isSubmitting.value = false;
  }
}

useSeoMeta({ title: "アンケートを作成" });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/admin/surveys" class="text-sm text-slate-500 hover:text-slate-700">アンケート</NuxtLink>
      <span class="text-slate-300">/</span>
      <h1 class="text-xl font-bold tracking-tight text-slate-900">新規作成</h1>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <p v-if="serverError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{{ serverError }}</p>

      <!-- 基本情報 -->
      <div class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-sm font-semibold text-slate-700">基本情報</h2>

        <AdminFormField label="タイトル" field-id="title" :error="errors.title" required>
          <input
            id="title"
            v-model="form.title"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="errors.title ? 'border-red-300' : ''"
            placeholder="第1回 勉強会アンケート"
          >
        </AdminFormField>

        <AdminFormField label="説明" field-id="description">
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="アンケートの目的や注意事項"
          />
        </AdminFormField>

        <div class="flex items-center gap-3">
          <input
            id="isActive"
            v-model="form.isActive"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
          >
          <label for="isActive" class="text-sm font-medium text-slate-700">作成後すぐに受付を開始する</label>
        </div>
      </div>

      <!-- 設問 -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">設問</h2>
          <p v-if="errors.questions" class="text-xs text-red-600">{{ errors.questions }}</p>
        </div>

        <div
          v-for="(q, i) in questions"
          :key="i"
          class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">設問 {{ i + 1 }}</span>
            <div class="flex gap-1">
              <button
                type="button"
                class="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                :disabled="i === 0"
                aria-label="上に移動"
                @click="moveUp(i)"
              >
                ▲
              </button>
              <button
                type="button"
                class="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                :disabled="i === questions.length - 1"
                aria-label="下に移動"
                @click="moveDown(i)"
              >
                ▼
              </button>
              <button
                type="button"
                class="rounded p-1 text-red-400 hover:bg-red-50"
                aria-label="設問を削除"
                @click="removeQuestion(i)"
              >
                ✕
              </button>
            </div>
          </div>

          <AdminFormField :label="`設問文`" :field-id="`q_${i}_text`" :error="errors[`q_${i}_text`]" required>
            <input
              :id="`q_${i}_text`"
              v-model="q.questionText"
              type="text"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="errors[`q_${i}_text`] ? 'border-red-300' : ''"
              placeholder="質問の内容を入力"
            >
          </AdminFormField>

          <AdminFormField label="回答形式" :field-id="`q_${i}_type`">
            <select
              :id="`q_${i}_type`"
              v-model="q.questionType"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              @change="handleQuestionTypeChange(q)"
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
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  :class="errors[`q_${i}_options`] ? 'border-red-300' : ''"
                  :placeholder="`選択肢 ${optionIndex + 1}`"
                >
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  :disabled="optionIndex === 0"
                  aria-label="選択肢を上に移動"
                  @click="moveOptionUp(q, optionIndex)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  :disabled="optionIndex === q.options.length - 1"
                  aria-label="選択肢を下に移動"
                  @click="moveOptionDown(q, optionIndex)"
                >
                  ▼
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-red-400 hover:bg-red-50"
                  aria-label="選択肢を削除"
                  @click="removeOption(q, optionIndex)"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                class="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                @click="addOption(q)"
              >
                + 選択肢を追加
              </button>
            </div>
          </AdminFormField>

          <div
            v-if="q.questionType !== 'free_text'"
            class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <input
              :id="`q_${i}_allow_other`"
              v-model="q.allowOtherText"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
            >
            <label :for="`q_${i}_allow_other`" class="text-sm font-medium text-slate-700">
              「その他」の自由記述欄を追加する
            </label>
          </div>
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          @click="addQuestion"
        >
          + 設問を追加
        </button>
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "作成中..." : "作成する" }}
        </button>
        <NuxtLink to="/admin/surveys" class="inline-flex items-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          キャンセル
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
