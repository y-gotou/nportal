<script setup lang="ts">
import { formatDisplayDate } from "~~/utils/content";
import { interactiveCardClass, secondaryButtonClass, topicTagClass } from "~/utils/ui";
import type { ResourceItem, ResourcesListResponse } from "~~/types/portal";

const { data } = await useFetch<ResourcesListResponse>("/api/resources", {
  default: () => ({ resources: [] }),
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
const allTags = computed(() => [...new Set(resources.value.flatMap((r) => r.tags))]);
const allTypes = computed(() => [...new Set(resources.value.map((r) => r.type))]);

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

useSeoMeta({
  title: "資料共有",
  description: "発表資料と参考リンクを絞り込みながら確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <SectionHeader
      title="資料共有"
      description="資料を検索し、必要に応じて種類やタグで絞り込めます。"
    />

    <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="space-y-2">
        <label for="resource-search" class="block text-sm font-medium text-slate-700">
          資料を検索
        </label>
        <input
          id="resource-search"
          v-model="search"
          name="resource-search"
          type="search"
          autocomplete="off"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          placeholder="タイトル・タグ・発表者で検索…"
        >
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-slate-700">種類</span>
        <button
          class="rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="selectedType === null ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          type="button"
          @click="selectedType = null"
        >
          すべて
        </button>
        <button
          v-for="type in allTypes"
          :key="type"
          class="rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="selectedType === type ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          type="button"
          @click="selectedType = selectedType === type ? null : type"
        >
          {{ type }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-slate-700">タグ</span>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          type="button"
          @click="selectedTag = selectedTag === tag ? null : tag"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <section v-if="filteredResources.length" class="mt-8 space-y-4">
      <SectionHeader
        :title="`${filteredResources.length}件の資料`"
        description="必要な資料から開いてください。"
      >
        <template #action>
          <button
            v-if="search || selectedType || selectedTag"
            type="button"
            :class="secondaryButtonClass"
            @click="search = ''; selectedType = null; selectedTag = null;"
          >
            条件をクリア
          </button>
        </template>
      </SectionHeader>

      <div class="space-y-3">
        <article
          v-for="resource in filteredResources"
          :key="resource.id"
          :class="`${interactiveCardClass} p-5`"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="text-sm text-slate-500">
                {{ formatDisplayDate(resource.date) }}
                <span class="ml-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{{ resource.type }}</span>
              </p>
              <h2 class="text-pretty text-lg font-semibold tracking-tight text-slate-900">
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
                関連議事録を見る
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </section>

    <p
      v-else
      class="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      条件に合う資料はありません。
    </p>
  </PageContainer>
</template>
