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
    <section class="stack-md section-block">
      <SectionHeader
        eyebrow="Filters"
        title="資料を絞り込む"
        description="種類とタグを組み合わせて必要な資料だけを表示します。"
      />

      <div class="panel panel--soft stack-sm">
        <div class="filter-row">
          <span class="filter-label">種類</span>
          <button
            class="filter-chip"
            :class="{ 'filter-chip--active': selectedType === null }"
            @click="selectedType = null"
          >
            すべて
          </button>
          <button
            v-for="type in allTypes"
            :key="type"
            class="filter-chip"
            :class="{ 'filter-chip--active': selectedType === type }"
            @click="selectedType = selectedType === type ? null : type"
          >
            {{ type }}
          </button>
        </div>

        <div class="filter-row">
          <span class="filter-label">タグ</span>
          <button
            v-for="tag in allTags"
            :key="tag"
            class="filter-chip"
            :class="{ 'filter-chip--active': selectedTag === tag }"
            @click="selectedTag = selectedTag === tag ? null : tag"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="filteredResources.length" class="stack-md">
      <SectionHeader
        eyebrow="Resources"
        :title="`${filteredResources.length}件の資料`"
        description="クリックすると新しいタブで資料を開きます。"
      />

      <div class="home-grid home-grid--two">
        <a
          v-for="resource in filteredResources"
          :key="resource.id"
          :href="resource.url"
          target="_blank"
          rel="noreferrer"
          class="panel panel--interactive stack-sm"
        >
          <div class="panel__row">
            <h3 class="panel__title">{{ resource.title }}</h3>
            <span class="tag tag--muted">{{ resource.type }}</span>
          </div>
          <p class="meta-text">
            {{ resource.date }}
            <span v-if="resource.presenter"> / {{ resource.presenter }}</span>
          </p>
          <div class="tag-list">
            <span v-for="tag in resource.tags" :key="tag" class="tag tag--accent">
              {{ tag }}
            </span>
          </div>
        </a>
      </div>
    </section>

    <p v-else class="empty-state">
      条件に合う資料はありません。
    </p>
  </PageContainer>
</template>
