<script setup lang="ts">
const props = defineProps<{
  confirmMessage?: string;
  fetchUrl: string;
  redirectTo?: string;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const isDeleting = ref(false);
const error = ref<string | null>(null);
const router = useRouter();

async function handleDelete() {
  const message = props.confirmMessage ?? "本当に削除しますか？この操作は取り消せません。";
  if (!confirm(message)) return;

  isDeleting.value = true;
  error.value = null;

  try {
    await $fetch(props.fetchUrl, { method: "DELETE" });
    emit("deleted");
    if (props.redirectTo) {
      await router.push(props.redirectTo);
    }
  }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "削除に失敗しました。";
    error.value = msg;
  }
  finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
      :disabled="isDeleting"
      @click="handleDelete"
    >
      {{ isDeleting ? "削除中..." : "削除" }}
    </button>
    <p v-if="error" class="mt-1 text-xs text-red-600" role="alert">{{ error }}</p>
  </div>
</template>
