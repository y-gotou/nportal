<script setup lang="ts">
import type { SpeakerApplication, SpeakerApplicationStatus, SpeakersListResponse } from "~~/types/portal";
import { speakerStatusClass, speakerStatusLabel } from "~/utils/status";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const { data, refresh } = await useFetch<SpeakersListResponse>("/api/speakers", {
  default: () => ({ applications: [] }),
});

const applications = computed(() => data.value?.applications ?? []);

const statusOptions: { value: SpeakerApplicationStatus; label: string }[] = (
  ["pending", "scheduled", "done"] as const
).map((value) => ({ value, label: speakerStatusLabel(value) }));

const updatingId = ref<number | null>(null);

async function changeStatus(app: SpeakerApplication, newStatus: SpeakerApplicationStatus) {
  if (app.status === newStatus) return;
  updatingId.value = app.id;
  try {
    await $fetch(`/api/admin/speakers/${app.id}`, {
      method: "PUT",
      body: { status: newStatus },
    });
    await refresh();
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : "ステータスの変更に失敗しました。");
  } finally {
    updatingId.value = null;
  }
}

useSeoMeta({ title: "発表募集管理" });
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold tracking-tight text-foreground">発表募集管理</h1>

    <div v-if="applications.length" class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table class="min-w-full divide-y divide-border">
        <thead class="bg-background">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">発表テーマ</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted sm:table-cell">応募者</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted md:table-cell">時間</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">ステータス</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="app in applications" :key="app.id" class="hover:bg-surface-hover">
            <td class="px-4 py-3">
              <p class="font-medium text-foreground">{{ app.title }}</p>
              <p v-if="app.note" class="mt-0.5 text-xs text-muted line-clamp-2">{{ app.note }}</p>
            </td>
            <td class="hidden px-4 py-3 text-sm text-muted sm:table-cell">
              {{ app.user_email }}
            </td>
            <td class="hidden px-4 py-3 text-sm text-muted md:table-cell">
              {{ app.duration }}分
            </td>
            <td class="px-4 py-3">
              <!-- select の value 属性は SSR で選択状態にならないため option の selected で指定する -->
              <select
                :disabled="updatingId === app.id"
                class="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                :class="speakerStatusClass(app.status)"
                @change="changeStatus(app, ($event.target as HTMLSelectElement).value as SpeakerApplicationStatus)"
              >
                <option
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  :value="opt.value"
                  :selected="opt.value === app.status"
                >
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td class="px-4 py-3 text-right">
              <AdminDeleteButton
                :fetch-url="`/api/admin/speakers/${app.id}`"
                confirm-message="この応募を削除しますか？この操作は取り消せません。"
                @deleted="refresh"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
      発表申し込みはまだありません。
    </p>
  </div>
</template>
