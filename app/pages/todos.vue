<script setup lang="ts">
import { TODO_ASSIGNEE_MAX_LENGTH, TODO_TITLE_MAX_LENGTH } from "#shared/utils/todos";
import { useCurrentUser } from "~/composables/useCurrentUser";
import { inputClass, primaryButtonClass } from "~/utils/ui";
import type { MinutesListResponse, TodosResponse } from "~~/types/portal";

const currentUser = useCurrentUser();

const [{ data, refresh }, { data: minutesData }] = await Promise.all([
  useFetch<TodosResponse>("/api/todos", { default: () => ({ todos: [] }) }),
  useFetch<MinutesListResponse>("/api/minutes", { default: () => ({ minutes: [] }) }),
]);

const todos = computed(() => data.value?.todos ?? []);
const minutesOptions = computed(() => minutesData.value?.minutes ?? []);

const emptyDraft = () => ({ title: "", assignee: "", dueDate: "", minutesSlug: "" });
const draft = ref(emptyDraft());
const isAdding = ref(false);
const errorMessage = ref("");

async function add() {
  isAdding.value = true;
  errorMessage.value = "";

  try {
    await $fetch("/api/todos", { method: "POST", body: draft.value });
    draft.value = emptyDraft();
    await refresh();
  }
  catch {
    errorMessage.value = "追加に失敗しました。時間をおいて再度お試しください。";
  }
  finally {
    isAdding.value = false;
  }
}

useSeoMeta({
  title: "課題",
  description: "会議で挙がった課題と対応状況を確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader title="課題一覧" />

    <form
      class="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm"
      @submit.prevent="add"
    >
      <input
        v-model.trim="draft.title"
        type="text"
        required
        placeholder="課題を追加"
        aria-label="課題"
        :maxlength="TODO_TITLE_MAX_LENGTH"
        :class="`${inputClass} min-w-48 flex-1`"
      >
      <input
        v-model="draft.assignee"
        type="text"
        placeholder="担当(任意)"
        aria-label="担当"
        :maxlength="TODO_ASSIGNEE_MAX_LENGTH"
        :class="`${inputClass} w-32`"
      >
      <input v-model="draft.dueDate" type="date" aria-label="期限" :class="inputClass">
      <select v-model="draft.minutesSlug" aria-label="議事録" :class="`${inputClass} max-w-48`">
        <option value="">議事録(任意)</option>
        <option v-for="option in minutesOptions" :key="option.slug" :value="option.slug">
          {{ option.title }}
        </option>
      </select>
      <button type="submit" :class="primaryButtonClass" :disabled="isAdding">追加</button>
      <p v-if="errorMessage" class="w-full text-sm text-red-600 dark:text-red-400" role="alert">
        {{ errorMessage }}
      </p>
    </form>

    <TodoTable
      v-if="todos.length"
      :todos="todos"
      :user="currentUser"
      :minutes-options="minutesOptions"
      show-minutes
      show-created-by
      collapse-done
      @changed="refresh()"
    />
    <p
      v-else
      class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      課題はまだありません。
    </p>
  </PageContainer>
</template>
