<script setup lang="ts">
import type { Survey, SurveyResponse } from "~~/types/portal";
import { buildSurveyResultBlocks } from "~~/utils/survey";
import { surfaceCardClass } from "~/utils/ui";

const props = defineProps<{
  survey: Survey;
  responses: SurveyResponse[];
}>();

const blocks = computed(() => buildSurveyResultBlocks(props.survey, props.responses));
</script>

<template>
  <div class="space-y-6">
    <section
      v-for="(block, index) in blocks"
      :key="block.id"
      :class="`${surfaceCardClass} space-y-4`"
    >
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Q{{ index + 1 }}
        </p>
        <h3 class="text-lg font-semibold tracking-tight text-slate-900">
          {{ block.questionText }}
        </h3>
        <p class="text-sm text-slate-500">回答数: {{ block.responseCount }}件</p>
      </div>

      <div v-if="block.questionType === 'free_text'" class="space-y-3">
        <p
          v-if="!block.freeTextAnswers.length"
          class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
        >
          まだ自由記述の回答はありません。
        </p>
        <div
          v-for="(answer, answerIndex) in block.freeTextAnswers"
          :key="`${block.id}-${answerIndex}`"
          class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
        >
          {{ answer }}
        </div>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in block.distribution"
          :key="item.label"
          class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div class="flex items-center justify-between gap-3 text-sm text-slate-700">
            <span>{{ item.label }}</span>
            <strong class="font-semibold text-slate-900">{{ item.value }}</strong>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-blue-500 transition-[width]"
              :style="{ width: item.width }"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
