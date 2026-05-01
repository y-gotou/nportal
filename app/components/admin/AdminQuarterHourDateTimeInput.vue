<script setup lang="ts">
import { SURVEY_SCHEDULE_GRANULARITY_MINUTES } from "~~/utils/survey";

const props = defineProps<{
  id: string;
  modelValue: string;
  defaultValue: string;
  invalid?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const dateValue = ref("");
const timeValue = ref("");
const selectedHour = ref("");
const selectedMinute = ref("");
const isTimePickerOpen = ref(false);
const rootElement = ref<HTMLElement | null>(null);
const hourListElement = ref<HTMLElement | null>(null);
const minuteListElement = ref<HTMLElement | null>(null);
const selectedHourElement = ref<HTMLElement | null>(null);
const selectedMinuteElement = ref<HTMLElement | null>(null);
const isEnabled = computed(() => props.modelValue.trim() !== "");

const hourOptions = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, "0"),
);
const minuteOptions = Array.from(
  { length: 60 / SURVEY_SCHEDULE_GRANULARITY_MINUTES },
  (_, index) =>
    String(index * SURVEY_SCHEDULE_GRANULARITY_MINUTES).padStart(2, "0"),
);

function syncParts(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  dateValue.value = match?.[1] ?? "";
  timeValue.value = match?.[2] ?? "";
  selectedHour.value = match?.[2]?.slice(0, 2) ?? "";
  selectedMinute.value = match?.[2]?.slice(3, 5) ?? "";
}

watch(
  () => props.modelValue,
  (value) => syncParts(value),
  { immediate: true },
);

watch([dateValue, timeValue], ([date, time]) => {
  const nextValue = date && time ? `${date}T${time}` : "";
  if (nextValue !== props.modelValue) {
    emit("update:modelValue", nextValue);
  }
});

watch(isTimePickerOpen, async (isOpen) => {
  if (!isOpen) {
    return;
  }

  await nextTick();
  scrollItemIntoList(hourListElement.value, selectedHourElement.value);
  scrollItemIntoList(minuteListElement.value, selectedMinuteElement.value);
});

function scrollItemIntoList(list: HTMLElement | null, item: HTMLElement | null) {
  if (!list || !item) {
    return;
  }

  list.scrollTop = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2;
}

function toggleEnabled() {
  emit("update:modelValue", isEnabled.value ? "" : props.defaultValue);
  isTimePickerOpen.value = false;
}

function updateTimeValue() {
  if (selectedHour.value && selectedMinute.value) {
    timeValue.value = `${selectedHour.value}:${selectedMinute.value}`;
  }
}

function selectHour(hour: string) {
  selectedHour.value = hour;
  updateTimeValue();
}

function selectMinute(minute: string) {
  selectedMinute.value = minute;
  updateTimeValue();
}

function setSelectedHourElement(element: Element | null, hour: string) {
  if (hour === selectedHour.value) {
    selectedHourElement.value = element instanceof HTMLElement ? element : null;
  }
}

function setSelectedMinuteElement(element: Element | null, minute: string) {
  if (minute === selectedMinute.value) {
    selectedMinuteElement.value = element instanceof HTMLElement ? element : null;
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isTimePickerOpen.value) {
    return;
  }

  const target = event.target;
  if (target instanceof Node && rootElement.value?.contains(target)) {
    return;
  }

  isTimePickerOpen.value = false;
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
</script>

<template>
  <div ref="rootElement" class="flex min-h-10 flex-wrap items-center gap-2">
    <button
      type="button"
      role="switch"
      :aria-checked="isEnabled"
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :class="isEnabled ? 'bg-blue-600' : 'bg-slate-300'"
      @click="toggleEnabled"
    >
      <span
        class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
        :class="isEnabled ? 'translate-x-5' : 'translate-x-0.5'"
      />
    </button>
    <span class="w-8 text-sm font-medium text-slate-700">{{ isEnabled ? "ON" : "OFF" }}</span>

    <template v-if="isEnabled">
      <input
        :id="id"
        v-model="dateValue"
        type="date"
        class="min-w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="invalid ? 'border-red-300' : ''"
      >
      <div class="relative">
        <button
          :id="`${id}-time`"
          type="button"
          class="flex w-28 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="invalid ? 'border-red-300' : ''"
          aria-haspopup="listbox"
          :aria-expanded="isTimePickerOpen"
          @click="isTimePickerOpen = !isTimePickerOpen"
        >
          <span>{{ timeValue || "時刻" }}</span>
          <span class="text-sm text-slate-400" aria-hidden="true">◷</span>
        </button>
        <div
          v-if="isTimePickerOpen"
          class="absolute left-0 z-20 mt-1 grid w-44 grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          :aria-labelledby="`${id}-time`"
        >
          <div class="border-r border-slate-100">
            <div class="border-b border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">時</div>
            <div
              ref="hourListElement"
              class="max-h-56 overflow-y-auto py-1"
              role="listbox"
              :aria-labelledby="`${id}-time`"
            >
              <button
                v-for="hour in hourOptions"
                :key="hour"
                :ref="(element) => setSelectedHourElement(element as Element | null, hour)"
                type="button"
                class="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                :class="hour === selectedHour ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'"
                role="option"
                :aria-selected="hour === selectedHour"
                @click="selectHour(hour)"
              >
                {{ hour }}
              </button>
            </div>
          </div>
          <div>
            <div class="border-b border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">分</div>
            <div
              ref="minuteListElement"
              class="max-h-56 overflow-y-auto py-1"
              role="listbox"
              :aria-labelledby="`${id}-time`"
            >
              <button
                v-for="minute in minuteOptions"
                :key="minute"
                :ref="(element) => setSelectedMinuteElement(element as Element | null, minute)"
                type="button"
                class="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                :class="minute === selectedMinute ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'"
                role="option"
                :aria-selected="minute === selectedMinute"
                @click="selectMinute(minute)"
              >
                {{ minute }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
    <input
      v-else
      :id="id"
      type="hidden"
    >
  </div>
</template>
