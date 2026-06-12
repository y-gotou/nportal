<script setup lang="ts">
import { X } from "lucide-vue-next";

defineProps<{
  src: string;
  fileName: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      @click="emit('close')"
    >
      <button
        type="button"
        class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        aria-label="閉じる"
        @click="emit('close')"
      >
        <X class="size-5" />
      </button>
      <img
        :src="src"
        :alt="fileName"
        class="max-h-full max-w-full rounded-lg object-contain"
        @click.stop
      >
    </div>
  </Teleport>
</template>
