<script setup lang="ts">
import type { Survey, SurveyQuestionType, SurveyResponse } from "~~/types/portal";
import {
  buildSurveyResultBlocks,
  parseSurveySelectionAnswer,
  SURVEY_OTHER_OPTION_LABEL,
  SURVEY_OTHER_OPTION_VALUE,
} from "~~/utils/survey";
import { surfaceCardClass } from "~/utils/ui";

const props = defineProps<{
  survey: Survey;
  responses: SurveyResponse[];
  myAnswers?: Record<number, string>;
}>();

const blocks = computed(() => buildSurveyResultBlocks(props.survey, props.responses));

function isMyChoice(questionId: number, optionLabel: string, questionType: SurveyQuestionType): boolean {
  const myAnswer = props.myAnswers?.[questionId];
  if (!myAnswer) return false;
  const parsedAnswer = parseSurveySelectionAnswer(myAnswer, questionType);
  const selectedValue =
    optionLabel === SURVEY_OTHER_OPTION_LABEL ? SURVEY_OTHER_OPTION_VALUE : optionLabel;
  return parsedAnswer.selected.includes(selectedValue);
}

function isMyFreeText(questionId: number, answer: string): boolean {
  const myAnswer = props.myAnswers?.[questionId];
  return myAnswer !== undefined && myAnswer.trim() === answer.trim();
}

function isMyOtherText(
  questionId: number,
  answer: string,
  questionType: SurveyQuestionType,
): boolean {
  const myAnswer = props.myAnswers?.[questionId];
  if (!myAnswer) return false;
  return parseSurveySelectionAnswer(myAnswer, questionType).otherText.trim() === answer.trim();
}
</script>

<template>
  <div class="space-y-6">
    <section
      v-for="(block, index) in blocks"
      :key="block.id"
      :class="`${surfaceCardClass} space-y-4`"
    >
      <div class="space-y-1">
        <p class="text-xs font-semibold tracking-[0.16em] text-slate-500">
          Q{{ index + 1 }}
        </p>
        <h3 class="text-lg font-semibold tracking-tight text-slate-900">
          {{ block.questionText }}
        </h3>
        <p class="text-sm text-slate-500">回答者数: {{ block.responseCount }}人</p>
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
          class="rounded-lg border px-4 py-3 text-sm leading-6"
          :class="
            isMyFreeText(block.id, answer)
              ? 'border-blue-300 bg-blue-50 text-blue-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          "
        >
          <span
            v-if="isMyFreeText(block.id, answer)"
            class="mb-1 block text-xs font-semibold text-blue-600"
          >あなたの回答</span>
          {{ answer }}
        </div>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in block.distribution"
          :key="item.label"
          class="space-y-2 rounded-lg border px-4 py-3"
          :class="
            isMyChoice(block.id, item.label, block.questionType)
              ? 'border-blue-300 bg-blue-50'
              : 'border-slate-200 bg-slate-50'
          "
        >
          <div class="flex items-center justify-between gap-3 text-sm"
            :class="
              isMyChoice(block.id, item.label, block.questionType)
                ? 'text-blue-700'
                : 'text-slate-700'
            "
          >
            <span class="flex items-center gap-1.5">
              <span
                v-if="isMyChoice(block.id, item.label, block.questionType)"
                class="text-xs font-semibold text-blue-600"
              >✓</span>
              {{ item.label }}
            </span>
            <strong class="font-semibold"
              :class="
                isMyChoice(block.id, item.label, block.questionType)
                  ? 'text-blue-800'
                  : 'text-slate-900'
              "
            >{{ item.value }}</strong>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full transition-[width]"
              :class="
                isMyChoice(block.id, item.label, block.questionType)
                  ? 'bg-blue-500'
                  : 'bg-slate-400'
              "
              :style="{ width: item.width }"
            />
          </div>
        </div>

        <div v-if="block.otherTextAnswers.length" class="space-y-3 rounded-lg border border-slate-200 bg-white px-4 py-4">
          <p class="text-sm font-semibold text-slate-700">その他の自由記述</p>
          <div
            v-for="(answer, answerIndex) in block.otherTextAnswers"
            :key="`${block.id}-other-${answerIndex}`"
            class="rounded-lg border px-4 py-3 text-sm leading-6"
            :class="
              isMyOtherText(block.id, answer, block.questionType)
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            "
          >
            <span
              v-if="isMyOtherText(block.id, answer, block.questionType)"
              class="mb-1 block text-xs font-semibold text-blue-600"
            >あなたの回答</span>
            {{ answer }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
