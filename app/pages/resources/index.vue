<script setup lang="ts">
import { formatDisplayDate } from "#shared/utils/content";
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass, topicTagClass } from "~/utils/ui";
import { matchesResourceFilters, resourceOpensInNewTab, resourceTypeIcon } from "~/utils/resources";
import { useCurrentUser } from "~/composables/useCurrentUser";
import { chatDisplayName } from "#shared/utils/chat";
import type { MinutesListResponse, ResourceItem, ResourcesListResponse } from "~~/types/portal";

const { data, refresh } = await useFetch<ResourcesListResponse>("/api/resources", {
  default: () => ({ resources: [] }),
});

const { data: minutesData } = await useFetch<MinutesListResponse>("/api/minutes", {
  default: () => ({ minutes: [] }),
});

const route = useRoute();
const router = useRouter();
const currentUser = useCurrentUser();

const search = ref(typeof route.query.q === "string" ? route.query.q : "");
const selectedTag = ref<string | null>(
  typeof route.query.tag === "string" ? route.query.tag : null,
);
const selectedType = ref<string | null>(
  typeof route.query.type === "string" ? route.query.type : null,
);
const mineOnly = ref(route.query.mine === "1");

const resources = computed(() => data.value?.resources ?? []);
const minutesOptions = computed(() => minutesData.value?.minutes ?? []);
const allTags = computed(() => [...new Set(resources.value.flatMap((r) => r.tags))]);
const allTypes = computed(() => [...new Set(resources.value.map((r) => r.type))]);
const showForm = ref(false);
const editingResource = ref<ResourceItem | null>(null);
const isFormDirty = ref(false);

const filteredResources = computed(() =>
  resources.value.filter((resource) =>
    matchesResourceFilters(resource, {
      keyword: search.value,
      type: selectedType.value,
      tag: selectedTag.value,
      mineOnly: mineOnly.value,
      userEmail: currentUser.value?.email ?? null,
    }),
  ),
);

// ファイル資料の直接リンク(/api/ 配信)は新規タブで開く。Markdown はビューアーページ(同一タブ)のまま
function syncQuery() {
  router.replace({
    query: {
      q: search.value.trim() || undefined,
      type: selectedType.value || undefined,
      tag: selectedTag.value || undefined,
      mine: mineOnly.value ? "1" : undefined,
    },
  });
}

watch([search, selectedTag, selectedType, mineOnly], syncQuery);

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.q === "string" ? query.q : "";
    const nextType = typeof query.type === "string" ? query.type : null;
    const nextTag = typeof query.tag === "string" ? query.tag : null;

    if (nextSearch !== search.value) search.value = nextSearch;
    if (nextType !== selectedType.value) selectedType.value = nextType;
    if (nextTag !== selectedTag.value) selectedTag.value = nextTag;
    if ((query.mine === "1") !== mineOnly.value) mineOnly.value = query.mine === "1";
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

function clearFilters() {
  search.value = "";
  selectedType.value = null;
  selectedTag.value = null;
  mineOnly.value = false;
}

const filterChipClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

function filterChipStateClass(selected: boolean) {
  return selected ? "bg-blue-500 text-white" : "bg-surface-hover text-muted hover:bg-border";
}

const rowButtonClass = "!rounded-md !px-2.5 !py-[5px] !text-[13px] !leading-[18px] whitespace-nowrap";

useSeoMeta({
  title: "資料共有",
  description: "発表資料と参考リンクを絞り込みながら確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader title="資料一覧">
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
          キーワード検索
        </label>
        <div class="flex items-center gap-2">
          <input
            id="resource-search"
            v-model="search"
            name="resource-search"
            type="search"
            autocomplete="off"
            class="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            placeholder="タイトル・タグ・投稿者で検索…"
          >
          <button
            type="button"
            :class="secondaryButtonClass"
            class="!px-2.5 !py-0 !text-xs shrink-0 self-stretch"
            @click="clearFilters"
          >
            条件をクリア
          </button>
        </div>
      </div>

      <!-- 見出しとボタン群を別の列に置き、ボタンが折り返した行も左端を揃える -->
      <div class="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-3 gap-y-4">
        <span class="text-sm font-medium text-foreground">種類</span>
        <div class="flex flex-wrap gap-2">
          <button
            :class="[filterChipClass, filterChipStateClass(selectedType === null)]"
            :aria-pressed="selectedType === null"
            type="button"
            @click="selectedType = null"
          >
            すべて
          </button>
          <button
            v-for="type in allTypes"
            :key="type"
            :class="[filterChipClass, filterChipStateClass(selectedType === type)]"
            :aria-pressed="selectedType === type"
            type="button"
            @click="selectedType = selectedType === type ? null : type"
          >
            <component
              :is="resourceTypeIcon(type).icon"
              class="h-4 w-4 shrink-0"
              :class="selectedType === type ? '' : resourceTypeIcon(type).colorClass"
              aria-hidden="true"
            />
            {{ type }}
          </button>
        </div>

        <template v-if="allTags.length">
          <span class="text-sm font-medium text-foreground">タグ</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in allTags"
              :key="tag"
              :class="[filterChipClass, filterChipStateClass(selectedTag === tag)]"
              :aria-pressed="selectedTag === tag"
              type="button"
              @click="selectedTag = selectedTag === tag ? null : tag"
            >
              {{ tag }}
            </button>
          </div>
        </template>

        <span class="text-sm font-medium text-foreground">投稿者</span>
        <div class="flex flex-wrap gap-2">
          <button
            :class="[filterChipClass, filterChipStateClass(!mineOnly)]"
            :aria-pressed="!mineOnly"
            type="button"
            @click="mineOnly = false"
          >
            すべて
          </button>
          <button
            :class="[filterChipClass, filterChipStateClass(mineOnly)]"
            :aria-pressed="mineOnly"
            type="button"
            @click="mineOnly = true"
          >
            自分の投稿
          </button>
        </div>
      </div>
    </div>

    <!-- lg 未満では行を flex にし、order で 日付・種類・投稿者/資料/タグ/ボタン の 4 段に積む -->
    <section
      v-if="filteredResources.length"
      class="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
    >
      <table class="block w-full text-sm lg:table">
        <thead class="hidden border-b border-border bg-background text-left text-xs text-muted lg:table-header-group">
          <tr>
            <th class="px-4 py-2.5 font-medium">資料</th>
            <th class="px-2 py-2.5 font-medium">種類</th>
            <th class="px-2 py-2.5 font-medium">タグ</th>
            <th class="px-2 py-2.5 font-medium">投稿者</th>
            <th class="px-2 py-2.5 font-medium">日付</th>
            <th class="px-4 py-2.5 font-medium"><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody class="block divide-y divide-border lg:table-row-group">
          <tr
            v-for="resource in filteredResources"
            :key="resource.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 lg:table-row"
          >
            <td class="order-4 basis-full break-words font-medium text-foreground lg:px-4 lg:py-2.5">
              {{ resource.title }}
            </td>
            <td class="order-2 lg:px-2 lg:py-2.5">
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-hover px-2 py-0.5 text-xs text-muted">
                <component
                  :is="resourceTypeIcon(resource.type).icon"
                  class="h-4 w-4 shrink-0"
                  :class="resourceTypeIcon(resource.type).colorClass"
                  aria-hidden="true"
                />
                {{ resource.type }}
              </span>
            </td>
            <td
              class="order-5 basis-full lg:px-2 lg:py-2.5"
              :class="{ 'hidden lg:table-cell': !resource.tags.length }"
            >
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="tag in resource.tags"
                  :key="tag"
                  :class="topicTagClass"
                  class="whitespace-nowrap"
                >
                  {{ tag }}
                </span>
              </div>
            </td>
            <td class="order-3 whitespace-nowrap text-muted lg:px-2 lg:py-2.5">
              <template v-if="resource.submittedBy">
                <span class="lg:hidden">投稿者: </span>{{ chatDisplayName(resource.submittedBy) }}
              </template>
            </td>
            <td class="order-1 whitespace-nowrap text-muted lg:px-2 lg:py-2.5">
              {{ formatDisplayDate(resource.date) }}
            </td>
            <td class="order-6 basis-full lg:px-4 lg:py-2">
              <!-- 表示しないボタンも同じ寸法の空枠を置き、行ごとにボタンの位置が変わらないようにする -->
              <div class="flex gap-2 lg:flex-row-reverse">
                <a
                  :href="resource.url"
                  :target="resourceOpensInNewTab(resource) ? '_blank' : undefined"
                  :rel="resourceOpensInNewTab(resource) ? 'noopener' : undefined"
                  :class="[primaryButtonClass, rowButtonClass]"
                >
                  開く
                </a>
                <NuxtLink
                  v-if="resource.relatedMinutesSlug"
                  :to="`/minutes/${resource.relatedMinutesSlug}`"
                  :class="[secondaryButtonClass, rowButtonClass]"
                >
                  議事録
                </NuxtLink>
                <span v-else aria-hidden="true" :class="[secondaryButtonClass, rowButtonClass]" class="invisible">議事録</span>
                <button
                  v-if="resource.canEdit"
                  type="button"
                  :class="[secondaryButtonClass, rowButtonClass]"
                  @click="openEditForm(resource)"
                >
                  編集
                </button>
                <span v-else aria-hidden="true" :class="[secondaryButtonClass, rowButtonClass]" class="invisible">編集</span>
                <button
                  v-if="resource.canEdit"
                  type="button"
                  :class="[dangerButtonClass, rowButtonClass]"
                  @click="deleteResource(resource)"
                >
                  削除
                </button>
                <span v-else aria-hidden="true" :class="[dangerButtonClass, rowButtonClass]" class="invisible">削除</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <p
      v-else
      class="mt-8 rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted"
    >
      {{ resources.length ? "条件に合う資料はありません。" : "資料はまだありません。" }}
    </p>
  </PageContainer>
</template>
