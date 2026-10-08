<script setup lang="ts">
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-vue-next";
import { chatDisplayName } from "#shared/utils/chat";
import { formatDisplayDate } from "#shared/utils/content";
import { jstToday } from "#shared/utils/date";
import { TODO_ASSIGNEE_MAX_LENGTH, TODO_TITLE_MAX_LENGTH, canEditTodo, isTodoOverdue } from "#shared/utils/todos";
import { iconButtonClass, inputClass } from "~/utils/ui";
import type { CurrentUser, MinutesMeta, Todo } from "~~/types/portal";

const props = defineProps<{
  todos: Todo[];
  // 渡さない場合は、どの課題も操作できない
  user?: CurrentUser | null;
  showMinutes?: boolean;
  showCreatedBy?: boolean;
  collapseDone?: boolean;
  minutesOptions?: MinutesMeta[];
}>();

const emit = defineEmits<{ changed: [] }>();

const today = jstToday();
const showDone = ref(false);
const editing = ref<{ id: number; title: string; assignee: string; dueDate: string; minutesSlug: string } | null>(null);
const isSaving = ref(false);
const errorMessage = ref("");

const doneCount = computed(() => props.todos.filter((todo) => todo.doneAt).length);
const rows = computed(() =>
  props.collapseDone && !showDone.value ? props.todos.filter((todo) => !todo.doneAt) : props.todos,
);
const canEdit = (todo: Todo) => canEditTodo(todo, props.user);
// 表示中の行ではなく全件で判定する。完了済みの展開で操作の列が増減しないようにするため
const hasEditable = computed(() => props.todos.some(canEdit));
const columnCount = computed(
  () => 4 + Number(props.showMinutes) + Number(props.showCreatedBy) + Number(hasEditable.value),
);

async function request(id: number, options: { method: "PUT" | "DELETE"; body?: Record<string, unknown> }) {
  isSaving.value = true;
  errorMessage.value = "";

  try {
    await $fetch(`/api/todos/${id}`, options);
    emit("changed");
    return true;
  }
  catch {
    errorMessage.value = "保存に失敗しました。時間をおいて再度お試しください。";
    return false;
  }
  finally {
    isSaving.value = false;
  }
}

function toggle(todo: Todo) {
  return request(todo.id, { method: "PUT", body: { done: !todo.doneAt } });
}

function startEdit(todo: Todo) {
  errorMessage.value = "";
  editing.value = {
    id: todo.id,
    title: todo.title,
    assignee: todo.assignee ?? "",
    dueDate: todo.dueDate ?? "",
    minutesSlug: todo.minutesSlug ?? "",
  };
}

async function saveEdit() {
  if (!editing.value?.title.trim()) return;

  const { id, ...body } = editing.value;
  if (await request(id, { method: "PUT", body })) {
    editing.value = null;
  }
}

function onEditKeydown(event: KeyboardEvent) {
  // 日本語入力の変換を確定・取り消す Enter と Esc では反応させない
  if (event.isComposing) return;

  if (event.key === "Enter") saveEdit();
  else if (event.key === "Escape") editing.value = null;
}

function remove(todo: Todo) {
  if (!confirm(`「${todo.title}」を削除しますか？この操作は取り消せません。`)) return;

  return request(todo.id, { method: "DELETE" });
}
</script>

<template>
  <div>
    <p v-if="errorMessage" class="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">
      {{ errorMessage }}
    </p>

    <!-- relative: 読み上げ専用の見出し(絶対配置)を枠内に収め、狭い画面でページ全体が横スクロールするのを防ぐ -->
    <div class="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table class="w-full text-sm">
        <thead class="border-b border-border bg-background text-left text-xs text-muted">
          <tr>
            <th class="w-12 px-4 py-2.5 font-medium"><span class="sr-only">完了</span></th>
            <th class="px-2 py-2.5 font-medium">課題</th>
            <th class="px-4 py-2.5 font-medium">担当</th>
            <th class="px-4 py-2.5 font-medium">期限</th>
            <th v-if="showMinutes" class="px-4 py-2.5 font-medium">議事録</th>
            <th v-if="showCreatedBy" class="px-4 py-2.5 font-medium">登録者</th>
            <th v-if="hasEditable" class="w-24 px-4 py-2.5 font-medium"><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="todo in rows" :key="todo.id" class="align-middle">
            <td class="px-4 py-3">
              <!-- 表示は取得し直した一覧に従わせるため、押下時点ではチェックの状態を変えない -->
              <input
                type="checkbox"
                class="block h-5 w-5 accent-emerald-600"
                :checked="todo.doneAt !== null"
                :disabled="!canEdit(todo) || isSaving"
                :aria-label="`${todo.title} を完了にする`"
                @click.prevent="toggle(todo)"
              >
            </td>

            <template v-if="editing?.id === todo.id">
              <td class="px-2 py-2" @keydown="onEditKeydown">
                <input
                  v-model="editing.title"
                  type="text"
                  aria-label="課題"
                  :maxlength="TODO_TITLE_MAX_LENGTH"
                  :class="`${inputClass} w-full min-w-64`"
                >
              </td>
              <td class="px-4 py-2" @keydown="onEditKeydown">
                <input
                  v-model="editing.assignee"
                  type="text"
                  aria-label="担当"
                  :maxlength="TODO_ASSIGNEE_MAX_LENGTH"
                  :class="`${inputClass} w-28`"
                >
              </td>
              <td class="px-4 py-2" @keydown="onEditKeydown">
                <input v-model="editing.dueDate" type="date" aria-label="期限" :class="inputClass">
              </td>
              <td v-if="showMinutes" class="px-4 py-2" @keydown="onEditKeydown">
                <select v-model="editing.minutesSlug" aria-label="議事録" :class="`${inputClass} max-w-48`">
                  <option value="">なし</option>
                  <option v-for="option in minutesOptions" :key="option.slug" :value="option.slug">
                    {{ option.title }}
                  </option>
                </select>
              </td>
              <td v-if="showCreatedBy" class="whitespace-nowrap px-4 py-2 text-muted">
                {{ todo.createdBy ? chatDisplayName(todo.createdBy) : "" }}
              </td>
              <td class="whitespace-nowrap px-4 py-2 text-right">
                <button type="button" :class="iconButtonClass" aria-label="保存" title="保存" :disabled="isSaving" @click="saveEdit">
                  <Check class="h-4 w-4" />
                </button>
                <button type="button" :class="iconButtonClass" aria-label="キャンセル" title="キャンセル" @click="editing = null">
                  <X class="h-4 w-4" />
                </button>
              </td>
            </template>

            <template v-else>
              <td
                class="min-w-64 break-words px-2 py-3 font-medium"
                :class="todo.doneAt ? 'text-muted line-through' : 'text-foreground'"
              >
                {{ todo.title }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-muted">{{ todo.assignee }}</td>
              <td
                class="whitespace-nowrap px-4 py-3"
                :class="isTodoOverdue(todo, today) ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted'"
              >
                {{ todo.dueDate ? formatDisplayDate(todo.dueDate) : "" }}
              </td>
              <td v-if="showMinutes" class="whitespace-nowrap px-4 py-3">
                <NuxtLink
                  v-if="todo.minutesSlug"
                  :to="`/minutes/${todo.minutesSlug}`"
                  class="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {{ todo.minutesTitle }}
                </NuxtLink>
              </td>
              <td v-if="showCreatedBy" class="whitespace-nowrap px-4 py-3 text-muted">
                {{ todo.createdBy ? chatDisplayName(todo.createdBy) : "" }}
              </td>
              <td v-if="hasEditable" class="whitespace-nowrap px-4 py-1 text-right">
                <template v-if="canEdit(todo)">
                  <button type="button" :class="iconButtonClass" aria-label="編集" title="編集" @click="startEdit(todo)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button type="button" :class="iconButtonClass" aria-label="削除" title="削除" :disabled="isSaving" @click="remove(todo)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </template>
              </td>
            </template>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columnCount" class="px-4 py-3 text-muted">未完了の課題はありません。</td>
          </tr>
        </tbody>
      </table>

      <button
        v-if="collapseDone && doneCount"
        type="button"
        class="sticky left-0 flex w-full items-center gap-1.5 border-t border-border px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        :aria-expanded="showDone"
        @click="showDone = !showDone"
      >
        <component :is="showDone ? ChevronDown : ChevronRight" class="h-4 w-4" aria-hidden="true" />
        完了済み({{ doneCount }}件)
      </button>
    </div>
  </div>
</template>
