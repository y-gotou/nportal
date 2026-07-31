<script setup lang="ts">
import type { NewsGlossaryTerm } from "~~/types/portal";

const props = defineProps<{
  text: string;
  glossary: NewsGlossaryTerm[];
}>();

// 本文中の [[用語]] を用語注に対応付ける。対応する用語注がなければ素のテキストとして出す。
const segments = computed(() => {
  const descriptions = new Map(props.glossary.map((item) => [item.term, item.description]));

  return props.text
    .split(/(\[\[[^\]]+\]\])/g)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const matched = /^\[\[([^\]]+)\]\]$/.exec(part);
      const term = matched?.[1];

      return {
        key: index,
        text: term ?? part,
        description: term ? descriptions.get(term) ?? null : null,
      };
    });
});
</script>

<template>
  <p class="text-sm leading-6 text-foreground">
    <template v-for="segment in segments" :key="segment.key">
      <NewsTerm
        v-if="segment.description"
        :term="segment.text"
        :description="segment.description"
      />
      <template v-else>{{ segment.text }}</template>
    </template>
  </p>
</template>
