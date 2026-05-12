<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { interactiveCardClass, primaryButtonClass, secondaryButtonClass, topicTagClass } from "~/utils/ui";
import type { MinutesListResponse, ResourceItem, ResourcesListResponse } from "~~/types/portal";

const { data, refresh } = await useFetch<ResourcesListResponse>("/api/resources", {
  default: () => ({ resources: [] }),
});

const { data: minutesData } = await useFetch<MinutesListResponse>("/api/minutes", {
  default: () => ({ minutes: [] }),
});

const route = useRoute();
const router = useRouter();

const search = ref(typeof route.query.q === "string" ? route.query.q : "");
const selectedTag = ref<string | null>(
  typeof route.query.tag === "string" ? route.query.tag : null,
);
const selectedType = ref<string | null>(
  typeof route.query.type === "string" ? route.query.type : null,
);

const resources = computed(() => data.value?.resources ?? []);
const minutesOptions = computed(() => minutesData.value?.minutes ?? []);
const allTags = computed(() => [...new Set(resources.value.flatMap((r) => r.tags))]);
const allTypes = computed(() => [...new Set(resources.value.map((r) => r.type))]);
const showForm = ref(false);
const editingResource = ref<ResourceItem | null>(null);
const isFormDirty = ref(false);

function matchesSelectedFilters(resource: ResourceItem) {
  if (selectedTag.value && !resource.tags.includes(selectedTag.value)) {
    return false;
  }

  if (selectedType.value && resource.type !== selectedType.value) {
    return false;
  }

  const keyword = search.value.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return (
    resource.title.toLowerCase().includes(keyword) ||
    (resource.presenter?.toLowerCase().includes(keyword) ?? false) ||
    (resource.fileName?.toLowerCase().includes(keyword) ?? false) ||
    (resource.submittedBy?.toLowerCase().includes(keyword) ?? false) ||
    resource.tags.some((tag) => tag.toLowerCase().includes(keyword))
  );
}

const filteredResources = computed(() => resources.value.filter(matchesSelectedFilters));

function syncQuery() {
  router.replace({
    query: {
      q: search.value.trim() || undefined,
      type: selectedType.value || undefined,
      tag: selectedTag.value || undefined,
    },
  });
}

watch([search, selectedTag, selectedType], syncQuery);

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.q === "string" ? query.q : "";
    const nextType = typeof query.type === "string" ? query.type : null;
    const nextTag = typeof query.tag === "string" ? query.tag : null;

    if (nextSearch !== search.value) search.value = nextSearch;
    if (nextType !== selectedType.value) selectedType.value = nextType;
    if (nextTag !== selectedTag.value) selectedTag.value = nextTag;
  },
  { deep: true },
);

function openCreateForm() {
  editingResource.value = null;
  isFormDirty.value = false;
  showForm.value = true;
}

function openEditForm(resource: ResourceItem) {
  editingResource.value = resource;
  isFormDirty.value = false;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingResource.value = null;
  isFormDirty.value = false;
}

function requestCloseForm() {
  if (isFormDirty.value && !confirm("入力中の内容は保存されていません。閉じてもよろしいですか？")) {
    return;
  }

  closeForm();
}

async function handleSaved() {
  await refresh();
  closeForm();
}

async function deleteResource(resource: ResourceItem) {
  if (!confirm("この資料を削除しますか？この操作は取り消せません。")) return;
  await $fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
  await refresh();
}

function formatFileSize(value?: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)}KB`;
  return `${(value / (1024 * 1024)).toFixed(1)}MB`;
}

useSeoMeta({
  title: "資料共有",
  description: "発表資料と参考リンクを絞り込みながら確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader title="資料共有">
      <template #action>
        <button type="button" :class="primaryButtonClass" @click="openCreateForm">
          資料を投稿
        </button>
      </template>
    </SectionHeader>

    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        role="presentation"
        @click.self="requestCloseForm"
      >
        <div
          class="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-form-title"
        >
          <div class="rounded-xl border border-border bg-surface shadow-xl">
            <div class="border-b border-border px-5 py-4">
              <h2 id="resource-form-title" class="text-lg font-semibold tracking-tight text-foreground">
                {{ editingResource ? "資料を編集" : "資料を投稿" }}
              </h2>
            </div>
            <ResourceSubmissionForm
              class="!rounded-t-none !border-0 !shadow-none"
              :resource="editingResource"
              :minutes-options="minutesOptions"
              @saved="handleSaved"
              @cancel="requestCloseForm"
              @dirty-change="isFormDirty = $event"
            />
          </div>
        </div>
      </div>
    </Teleport>

    <div class="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div class="space-y-2">
        <label for="resource-search" class="block text-sm font-medium text-foreground">
          資料を検索
        </label>
        <div class="flex items-center gap-2">
          <input
            id="resource-search"
            v-model="search"
            name="resource-search"
            type="search"
            autocomplete="off"
            class="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            placeholder="タイトル・タグ・発表者で検索…"
          >
          <button
            type="button"
            :class="secondaryButtonClass"
            class="!px-2.5 !py-0 !text-xs shrink-0 self-stretch"
            @click="search = ''; selectedType = null; selectedTag = null;"
          >
            条件をクリア
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-foreground">種類</span>
        <button
          class="rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="selectedType === null ? 'bg-blue-500 text-white' : 'bg-surface-hover text-muted hover:bg-border'"
          type="button"
          @click="selectedType = null"
        >
          すべて
        </button>
        <button
          v-for="type in allTypes"
          :key="type"
          class="rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="selectedType === type ? 'bg-blue-500 text-white' : 'bg-surface-hover text-muted hover:bg-border'"
          type="button"
          @click="selectedType = selectedType === type ? null : type"
        >
          {{ type }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-foreground">タグ</span>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-surface-hover text-muted hover:bg-border'"
          type="button"
          @click="selectedTag = selectedTag === tag ? null : tag"
        >
          {{ tag }}
        </button>
      </div>

    </div>

    <section v-if="filteredResources.length" class="mt-8 space-y-4">

      <div class="space-y-3">
        <article
          v-for="resource in filteredResources"
          :key="resource.id"
          :class="`${interactiveCardClass} p-5`"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-muted">
                {{ formatDisplayDate(resource.date) }}
                <span class="ml-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted">{{ resource.type }}</span>
              </p>
              <h2 class="text-pretty text-lg font-semibold tracking-tight text-foreground">
                {{ resource.title }}
              </h2>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in resource.tags"
                  :key="tag"
                  :class="topicTagClass"
                >
                  {{ tag }}
                </span>
              </div>
              <p v-if="resource.fileName" class="text-sm text-muted">
                {{ resource.fileName }} <span v-if="resource.fileSize">({{ formatFileSize(resource.fileSize) }})</span>
              </p>
              <p v-if="resource.submittedBy" class="text-xs text-muted">
                投稿者: {{ resource.submittedBy }}
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <a
                :href="resource.url"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                資料を開く
              </a>
              <NuxtLink
                v-if="resource.relatedMinutesSlug"
                :to="`/minutes/${resource.relatedMinutesSlug}`"
                :class="secondaryButtonClass"
              >
                関連議事録
              </NuxtLink>
              <button
                v-if="resource.canEdit"
                type="button"
                :class="secondaryButtonClass"
                @click="openEditForm(resource)"
              >
                編集
              </button>
              <button
                v-if="resource.canEdit"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-surface px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                @click="deleteResource(resource)"
              >
                削除
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <p
      v-else
      class="mt-8 rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      条件に合う資料はありません。
    </p>
  </PageContainer>
</template>
