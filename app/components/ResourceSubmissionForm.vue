<script setup lang="ts">
import type { MinutesMeta, ResourceItem } from "~~/types/portal";
import { primaryButtonClass, secondaryButtonClass } from "~/utils/ui";

const props = defineProps<{
  resource?: ResourceItem | null;
  minutesOptions: MinutesMeta[];
}>();

const emit = defineEmits<{
  saved: [];
  cancel: [];
  "dirty-change": [dirty: boolean];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isSubmitting = ref(false);
const serverError = ref<string | null>(null);
const sourceMode = ref<"url" | "file">("url");
const currentUser = useCurrentUser();
const canSubmitZip = computed(() => currentUser.value?.isAdmin === true);
const fileAccept = computed(() => [
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ...(canSubmitZip.value ? [".zip"] : []),
].join(","));
const fileHint = computed(() =>
  canSubmitZip.value
    ? "50MB まで。PDF、Office、画像、CSV、テキスト等に対応します。"
    : "50MB まで。PDF、Office、画像、CSV、テキスト等に対応します。zipは管理者のみ投稿できます。",
);

const form = reactive({
  title: "",
  url: "",
  tags: "",
  relatedMinutesSlug: "",
});

const errors = reactive<Record<string, string>>({});
const initialState = ref({
  title: "",
  url: "",
  tags: "",
  relatedMinutesSlug: "",
  sourceMode: "url" as "url" | "file",
});
const isEditing = computed(() => Boolean(props.resource));
const existingFileName = computed(() =>
  props.resource?.sourceType === "file" ? props.resource.fileName : null,
);
const isDirty = computed(() =>
  form.title !== initialState.value.title ||
  form.url !== initialState.value.url ||
  form.tags !== initialState.value.tags ||
  form.relatedMinutesSlug !== initialState.value.relatedMinutesSlug ||
  sourceMode.value !== initialState.value.sourceMode ||
  selectedFile.value !== null,
);

function resetForm(resource?: ResourceItem | null) {
  form.title = resource?.title ?? "";
  form.url = resource?.sourceType === "url" ? resource.url : "";
  form.tags = resource?.tags.join(", ") ?? "";
  form.relatedMinutesSlug = resource?.relatedMinutesSlug ?? "";
  sourceMode.value = resource?.sourceType === "file" ? "file" : "url";
  initialState.value = {
    title: form.title,
    url: form.url,
    tags: form.tags,
    relatedMinutesSlug: form.relatedMinutesSlug,
    sourceMode: sourceMode.value,
  };
  selectedFile.value = null;
  serverError.value = null;
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (fileInput.value) fileInput.value.value = "";
  emit("dirty-change", false);
}

watch(
  () => props.resource,
  (resource) => resetForm(resource),
  { immediate: true },
);

watch(isDirty, (dirty) => emit("dirty-change", dirty));

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".zip");
}

function validate() {
  const nextErrors: Record<string, string> = {};
  const hasSelectedUrl = sourceMode.value === "url" && Boolean(form.url.trim());
  const hasSelectedFile = sourceMode.value === "file" && Boolean(selectedFile.value);
  const canKeepExistingFile = sourceMode.value === "file" && props.resource?.sourceType === "file" && !selectedFile.value;

  if (!form.title.trim()) {
    nextErrors.title = "タイトルは必須です。";
  }

  if (sourceMode.value === "url" && !hasSelectedUrl) {
    nextErrors.source = "URLを入力してください。";
  } else if (sourceMode.value === "file" && !hasSelectedFile && !canKeepExistingFile) {
    nextErrors.source = "ファイルを選択してください。";
  } else if (
    sourceMode.value === "file" &&
    selectedFile.value &&
    isZipFile(selectedFile.value) &&
    !canSubmitZip.value
  ) {
    nextErrors.source = "zipは管理者のみ投稿できます。";
  }

  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(errors, nextErrors);
  return Object.keys(nextErrors).length === 0;
}

async function submit() {
  if (!validate()) return;

  const body = new FormData();
  body.append("title", form.title.trim());
  body.append("tags", form.tags);
  body.append("relatedMinutesSlug", form.relatedMinutesSlug);

  if (sourceMode.value === "file" && selectedFile.value) {
    body.append("file", selectedFile.value);
  } else if (sourceMode.value === "url") {
    body.append("url", form.url.trim());
  }

  isSubmitting.value = true;
  serverError.value = null;

  try {
    await $fetch(props.resource ? `/api/resources/${props.resource.id}` : "/api/resources", {
      method: props.resource ? "PUT" : "POST",
      body,
    });
    if (!props.resource) resetForm(null);
    emit("saved");
  } catch (error: unknown) {
    serverError.value = error instanceof Error ? error.message : "保存に失敗しました。";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form class="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm" @submit.prevent="submit">
    <p v-if="serverError" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" role="alert">
      {{ serverError }}
    </p>

    <AdminFormField label="タイトル" field-id="resource-title" :error="errors.title" required>
      <input
        id="resource-title"
        v-model="form.title"
        type="text"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="errors.title ? 'border-red-300 dark:border-red-700' : ''"
      >
    </AdminFormField>

    <div class="space-y-3">
      <div class="inline-flex rounded-lg border border-border bg-background p-1" role="group" aria-label="資料の投稿方法">
        <button
          type="button"
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="sourceMode === 'url' ? 'bg-surface text-blue-600 shadow-sm' : 'text-muted hover:text-foreground'"
          @click="sourceMode = 'url'"
        >
          URL
        </button>
        <button
          type="button"
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="sourceMode === 'file' ? 'bg-surface text-blue-600 shadow-sm' : 'text-muted hover:text-foreground'"
          @click="sourceMode = 'file'"
        >
          ファイル
        </button>
      </div>

      <AdminFormField
        v-if="sourceMode === 'url'"
        label="URL"
        field-id="resource-url"
        :error="errors.source"
        hint="共有する資料のURLを入力します。"
      >
        <input
          id="resource-url"
          v-model="form.url"
          type="url"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="errors.source ? 'border-red-300 dark:border-red-700' : ''"
          placeholder="https://..."
        >
      </AdminFormField>

      <AdminFormField
        v-else
        label="ファイル"
        field-id="resource-file"
        :error="errors.source"
        :hint="fileHint"
      >
        <input
          id="resource-file"
          ref="fileInput"
          type="file"
          :accept="fileAccept"
          class="block w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-surface-hover file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-border"
          @change="onFileChange"
        >
        <p v-if="existingFileName && !selectedFile" class="text-xs text-muted">
          現在のファイル: {{ existingFileName }}
        </p>
      </AdminFormField>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <AdminFormField label="タグ" field-id="resource-tags" hint="カンマ区切り">
        <input
          id="resource-tags"
          v-model="form.tags"
          type="text"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="ChatGPT, プロンプト設計"
        >
      </AdminFormField>

      <AdminFormField label="関連議事録" field-id="resource-minutes" hint="任意">
        <select
          id="resource-minutes"
          v-model="form.relatedMinutesSlug"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value="">未選択</option>
          <option
            v-for="minutes in minutesOptions"
            :key="minutes.slug"
            :value="minutes.slug"
          >
            {{ minutes.date }} {{ minutes.title }}
          </option>
        </select>
      </AdminFormField>
    </div>

    <div class="flex flex-wrap gap-3">
      <button type="submit" :class="primaryButtonClass" :disabled="isSubmitting">
        {{ isSubmitting ? "保存中..." : (isEditing ? "保存する" : "投稿する") }}
      </button>
      <button type="button" :class="secondaryButtonClass" @click="emit('cancel')">
        キャンセル
      </button>
    </div>
  </form>
</template>
