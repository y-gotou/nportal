<script setup lang="ts">
defineProps<{
  label: string;
  fieldId: string;
  error?: string | null;
  required?: boolean;
  hint?: string;
  inline?: boolean;
  inlineLabelClass?: string;
}>();
</script>

<template>
  <div class="space-y-1.5">
    <div v-if="inline" class="flex flex-wrap items-center gap-3">
      <label
        :for="fieldId"
        class="shrink-0 text-sm font-medium text-slate-700"
        :class="inlineLabelClass"
      >
        {{ label }}
        <span v-if="required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
      </label>
      <slot />
    </div>
    <template v-else>
      <label :for="fieldId" class="block text-sm font-medium text-slate-700">
        {{ label }}
        <span v-if="required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
      </label>
      <p v-if="hint" class="text-xs text-slate-500">{{ hint }}</p>
      <slot />
    </template>
    <p v-if="inline && hint" class="text-xs text-slate-500">{{ hint }}</p>
    <p v-if="error" :id="`${fieldId}-error`" class="text-xs text-red-600" role="alert">{{ error }}</p>
  </div>
</template>
