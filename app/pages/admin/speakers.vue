<script setup lang="ts">
import type { MinutesListResponse, ResourcesListResponse, SpeakerApplication, SpeakerApplicationStatus, SpeakersListResponse } from "~~/types/portal";
import { formatDisplayDate } from "#shared/utils/content";
import { speakerStatusClass, speakerStatusLabel } from "~/utils/status";

definePageMeta({ layout: "admin" });
await useAdminGuard();

const [{ data, refresh }, { data: minutesData }, { data: resourcesData, refresh: refreshResources }] = await Promise.all([
  useFetch<SpeakersListResponse>("/api/speakers", {
    default: () => ({ applications: [] }),
  }),
  useFetch<MinutesListResponse>("/api/minutes", {
    default: () => ({ minutes: [] }),
  }),
  useFetch<ResourcesListResponse>("/api/resources", {
    default: () => ({ resources: [] }),
  }),
]);

const applications = computed(() => data.value?.applications ?? []);
const minutesOptions = computed(() => minutesData.value?.minutes ?? []);
// 管理者は全資料から選べるが、他の応募に紐付いているものは候補から除く
function resourceOptions(app: SpeakerApplication) {
  return (resourcesData.value?.resources ?? []).filter(
    (resource) => !resource.linkedApplication || resource.linkedApplication.id === app.id,
  );
}

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

async function changeMinutes(app: SpeakerApplication, slug: string) {
  const newSlug = slug || null;
  if (app.minutes_slug === newSlug) return;
  updatingId.value = app.id;
  try {
    await $fetch(`/api/admin/speakers/${app.id}`, {
      method: "PUT",
      body: { minutes_slug: newSlug },
    });
    await refresh();
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : "議事録の紐付けに失敗しました。");
  } finally {
    updatingId.value = null;
  }
}

async function changeResource(app: SpeakerApplication, value: string) {
  const newResourceId = value === "" ? null : Number(value);
  if (app.resource_id === newResourceId) return;
  updatingId.value = app.id;
  try {
    await $fetch(`/api/admin/speakers/${app.id}`, {
      method: "PUT",
      body: { resource_id: newResourceId },
    });
    await Promise.all([refresh(), refreshResources()]);
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : "資料の紐付けに失敗しました。");
    await refresh();
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
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">議事録</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">資料</th>
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
            <td class="px-4 py-3">
              <!-- select の value 属性は SSR で選択状態にならないため option の selected で指定する -->
              <select
                :disabled="updatingId === app.id"
                class="max-w-48 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-medium text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                @change="changeMinutes(app, ($event.target as HTMLSelectElement).value)"
              >
                <option value="" :selected="!app.minutes_slug">紐付けなし</option>
                <option
                  v-for="minutes in minutesOptions"
                  :key="minutes.slug"
                  :value="minutes.slug"
                  :selected="minutes.slug === app.minutes_slug"
                >
                  {{ formatDisplayDate(minutes.date) }} {{ minutes.title }}
                </option>
              </select>
            </td>
            <td class="px-4 py-3">
              <!-- select の value 属性は SSR で選択状態にならないため option の selected で指定する -->
              <select
                :disabled="updatingId === app.id"
                class="max-w-48 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-medium text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                @change="changeResource(app, ($event.target as HTMLSelectElement).value)"
              >
                <option value="" :selected="app.resource_id === null">紐付けなし</option>
                <option
                  v-for="resource in resourceOptions(app)"
                  :key="resource.id"
                  :value="resource.id"
                  :selected="resource.id === app.resource_id"
                >
                  {{ resource.title }}
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
