<script setup lang="ts">
import type { SpeakerApplication, SpeakersListResponse } from "~~/types/portal";
import { primaryButtonClass, secondaryButtonClass, surfaceCardClass } from "~/utils/ui";
import { useCurrentUser } from "~/composables/useCurrentUser";

const currentUser = useCurrentUser();

const { data, refresh, error } = await useFetch<SpeakersListResponse>("/api/speakers");
const applications = computed(() => data.value?.applications ?? []);

const pendingApplications = computed(() =>
  applications.value.filter((a) => a.status === "pending"),
);
const scheduledApplications = computed(() =>
  applications.value.filter((a) => a.status === "scheduled"),
);
const doneApplications = computed(() =>
  applications.value.filter((a) => a.status === "done"),
);

const showForm = ref(false);
const editingId = ref<number | null>(null);
const formTitle = ref("");
const formDuration = ref<number | "">(15);
const formNote = ref("");
const formError = ref<string | null>(null);
const isSubmitting = ref(false);

function openCreateForm() {
  editingId.value = null;
  formTitle.value = "";
  formDuration.value = 15;
  formNote.value = "";
  formError.value = null;
  showForm.value = true;
}

function openEditForm(app: SpeakerApplication) {
  editingId.value = app.id;
  formTitle.value = app.title;
  formDuration.value = app.duration;
  formNote.value = app.note ?? "";
  formError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  formError.value = null;
}

async function submitForm() {
  if (!formTitle.value.trim()) {
    formError.value = "発表テーマ・タイトルを入力してください。";
    return;
  }
  const duration = Number(formDuration.value);
  if (!Number.isInteger(duration) || duration < 1) {
    formError.value = "発表時間は1以上の整数を入力してください。";
    return;
  }

  isSubmitting.value = true;
  formError.value = null;

  try {
    const payload = {
      title: formTitle.value.trim(),
      duration,
      note: formNote.value.trim() || null,
    };

    if (editingId.value !== null) {
      await $fetch(`/api/speakers/${editingId.value}`, { method: "PUT", body: payload });
    } else {
      await $fetch("/api/speakers", { method: "POST", body: payload });
    }

    await refresh();
    closeForm();
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : "送信に失敗しました。";
  } finally {
    isSubmitting.value = false;
  }
}

async function withdrawApplication(id: number) {
  if (!confirm("応募を取り下げますか？")) return;
  try {
    await $fetch(`/api/speakers/${id}`, { method: "DELETE" });
    await refresh();
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : "取り下げに失敗しました。");
  }
}

function getStatusLabel(status: SpeakerApplication["status"]) {
  if (status === "pending") return "応募中";
  if (status === "scheduled") return "発表予定";
  return "発表済み";
}

function getStatusClass(status: SpeakerApplication["status"]) {
  if (status === "pending") return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
  if (status === "scheduled") return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
  return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
}

useSeoMeta({
  title: "発表募集",
  description: "AI勉強会の発表者を募集しています。発表を希望する方はエントリーしてください。",
});
</script>

<template>
  <PageContainer size="wide">
    <div class="flex items-start justify-between gap-4">
      <SectionHeader title="発表者募集" />
      <button
        v-if="currentUser"
        type="button"
        :class="primaryButtonClass"
        @click="openCreateForm"
      >
        発表を申し込む
      </button>
    </div>

    <div
      v-if="error"
      class="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20"
      role="alert"
    >
      <p class="font-medium text-rose-800 dark:text-rose-300">データの読み込みに失敗しました</p>
      <p class="mt-1 text-sm text-rose-600 dark:text-rose-400">しばらくしてからページを再読み込みしてください。</p>
    </div>

    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="closeForm"
      >
        <div class="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
          <h2 class="text-lg font-bold text-foreground">
            {{ editingId !== null ? "応募内容を編集" : "発表を申し込む" }}
          </h2>

          <form class="mt-5 space-y-4" @submit.prevent="submitForm">
            <div>
              <label class="block text-sm font-medium text-foreground" for="form-title">
                発表テーマ・タイトル <span class="text-red-500">*</span>
              </label>
              <input
                id="form-title"
                v-model="formTitle"
                type="text"
                class="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="例: LLMのファインチューニング入門"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground" for="form-duration">
                発表時間（分）<span class="text-red-500">*</span>
              </label>
              <input
                id="form-duration"
                v-model.number="formDuration"
                type="number"
                min="1"
                max="120"
                class="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="15"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground" for="form-note">
                備考・コメント
              </label>
              <textarea
                id="form-note"
                v-model="formNote"
                rows="3"
                class="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="発表概要や希望日程など、自由に記載してください"
              />
            </div>

            <p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>

            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                :class="secondaryButtonClass"
                @click="closeForm"
              >
                キャンセル
              </button>
              <button
                type="submit"
                :class="primaryButtonClass"
                :disabled="isSubmitting"
              >
                {{ isSubmitting ? "送信中..." : (editingId !== null ? "更新する" : "申し込む") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <div v-if="!error" class="space-y-8">
      <template
        v-for="group in [
          { label: '応募中', color: 'text-amber-600 dark:text-amber-400', items: pendingApplications },
          { label: '発表予定', color: 'text-blue-600 dark:text-blue-400', items: scheduledApplications },
          { label: '発表済み', color: 'text-green-600 dark:text-green-400', items: doneApplications },
        ]"
        :key="group.label"
      >
        <section v-if="group.items.length > 0">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {{ group.label }}
            <span :class="group.color" class="ml-1">{{ group.items.length }}件</span>
          </h2>
          <div class="space-y-3">
            <div
              v-for="app in group.items"
              :key="app.id"
              :class="surfaceCardClass"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0 space-y-1.5">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-base font-semibold text-foreground">{{ app.title }}</h3>
                    <span
                      class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      :class="getStatusClass(app.status)"
                    >
                      {{ getStatusLabel(app.status) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-3 text-sm text-muted">
                    <span>{{ app.user_email }}</span>
                    <span class="text-border">|</span>
                    <span>{{ app.duration }}分</span>
                  </div>
                  <p v-if="app.note" class="text-sm text-muted">{{ app.note }}</p>
                </div>

                <div
                  v-if="currentUser?.email === app.user_email && app.status !== 'done'"
                  class="flex shrink-0 gap-2"
                >
                  <button
                    type="button"
                    class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover"
                    @click="openEditForm(app)"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    @click="withdrawApplication(app.id)"
                  >
                    取り下げ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>

      <p
        v-if="applications.length === 0"
        class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
      >
        発表申し込みはまだありません。ぜひエントリーしてください！
      </p>
    </div>
  </PageContainer>
</template>
