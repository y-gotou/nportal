<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
  agenda?: string | null;
}>();

const id = useId();
</script>

<template>
  <template v-if="agenda">
    <!-- ボタンの見た目は並びのボタンに揃えるため、親から class で指定する -->
    <button
      type="button"
      v-bind="$attrs"
      :popovertarget="id"
      :style="`anchor-name: --${id}`"
    >
      議題
    </button>
    <!-- anchor positioning 非対応のブラウザでは、popover 既定の画面中央表示になる -->
    <div
      :id="id"
      popover
      :style="`position-anchor: --${id}`"
      class="max-h-[60vh] w-max max-w-[min(28rem,calc(100vw-2rem))] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-foreground shadow-lg supports-[position-area:bottom]:mx-0 supports-[position-area:bottom]:my-2 supports-[position-area:bottom]:[position-area:bottom_span-right] supports-[position-area:bottom]:[position-try-fallbacks:flip-inline,bottom_span-all,flip-block]"
    >{{ agenda }}</div>
  </template>
</template>
