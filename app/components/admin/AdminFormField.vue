<script setup lang="ts">
defineProps<{
  label: string;
  fieldId: string;
  error?: string | null;
  required?: boolean;
  hint?: string;
}>();
</script>

<template>
  <div class="space-y-1.5">
    <label :for="fieldId" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
    </label>
    <p v-if="hint" class="text-xs text-slate-500">{{ hint }}</p>
    <slot />
    <p v-if="error" :id="`${fieldId}-error`" class="text-xs text-red-600" role="alert">{{ error }}</p>
  </div>
</template>
