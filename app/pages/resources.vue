<script setup lang="ts">
import { getResources } from "~/utils/content";

const resources = getResources();
const selectedTag = ref<string | null>(null);
const selectedType = ref<string | null>(null);

const allTags = [...new Set(resources.flatMap((resource) => resource.tags))];
const allTypes = [...new Set(resources.map((resource) => resource.type))];

const filteredResources = computed(() =>
  resources.filter((resource) => {
    if (selectedTag.value && !resource.tags.includes(selectedTag.value)) {
      return false;
    }

    if (selectedType.value && resource.type !== selectedType.value) {
      return false;
    }

    return true;
  }),
);

useSeoMeta({
  title: "資料共有",
  description: "発表資料と参考リンクを絞り込みながら確認できます。",
});
</script>

<template>
  <PageContainer size="wide">
    <section class="space-y-4">
      <SectionHeader
        eyebrow="Filters"
        title="資料を絞り込む"
        description="種類とタグを組み合わせて必要な資料だけを表示します。"
      />

      <div class="space-y-4 rounded-xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-1 text-sm font-medium text-slate-700">種類</span>
          <button
            class="rounded-full px-3 py-1.5 text-sm transition-colors"
            :class="
              selectedType === null
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="selectedType = null"
          >
            すべて
          </button>
          <button
            v-for="type in allTypes"
            :key="type"
            class="rounded-full px-3 py-1.5 text-sm transition-colors"
            :class="
              selectedType === type
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="selectedType = selectedType === type ? null : type"
          >
            {{ type }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-1 text-sm font-medium text-slate-700">タグ</span>
          <button
            v-for="tag in allTags"
            :key="tag"
            class="rounded-full px-3 py-1.5 text-sm transition-colors"
            :class="
              selectedTag === tag
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="selectedTag = selectedTag === tag ? null : tag"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="filteredResources.length" class="mt-10 space-y-4">
      <SectionHeader
        eyebrow="Resources"
        :title="`${filteredResources.length}件の資料`"
        description="クリックすると新しいタブで資料を開きます。"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <a
          v-for="resource in filteredResources"
          :key="resource.id"
          :href="resource.url"
          target="_blank"
          rel="noreferrer"
          class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-lg font-semibold tracking-tight text-slate-900">{{ resource.title }}</h3>
            <span class="rounded bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
              {{ resource.type }}
            </span>
          </div>
          <p class="text-sm text-slate-500">
            {{ resource.date }}
            <span v-if="resource.presenter"> / {{ resource.presenter }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in resource.tags"
              :key="tag"
              class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600"
            >
              {{ tag }}
            </span>
          </div>
        </a>
      </div>
    </section>

    <p
      v-else
      class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500"
    >
      条件に合う資料はありません。
    </p>
  </PageContainer>
</template>
