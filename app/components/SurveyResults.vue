<script setup lang="ts">
import type { Survey, SurveyResponse } from "~~/types/portal";

const props = defineProps<{
  survey: Survey;
  responses: SurveyResponse[];
}>();

const blocks = computed(() =>
  props.survey.questions.map((question) => {
    const questionResponses = props.responses.filter(
      (response) => response.questionId === question.id,
    );

    if (question.questionType === "free_text") {
      return {
        ...question,
        responseCount: questionResponses.length,
        freeTextAnswers: questionResponses
          .map((response) => response.answer.trim())
          .filter(Boolean),
        distribution: [],
      };
    }

    const counts = Object.fromEntries(question.options.map((option) => [option, 0]));

    for (const response of questionResponses) {
      if (question.questionType === "multiple_choice") {
        let values: string[] = [];

        try {
          values = JSON.parse(response.answer) as string[];
        } catch {
          values = response.answer.split(",").map((value) => value.trim()).filter(Boolean);
        }

        for (const value of values) {
          if (value in counts) {
            counts[value] += 1;
          }
        }
      } else if (response.answer in counts) {
        counts[response.answer] += 1;
      }
    }

    const distribution = Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      width: questionResponses.length
        ? `${Math.max((value / questionResponses.length) * 100, value ? 8 : 0)}%`
        : "0%",
    }));

    return {
      ...question,
      responseCount: questionResponses.length,
      freeTextAnswers: [],
      distribution,
    };
  }),
);
</script>

<template>
  <div class="stack-lg">
    <section v-for="(block, index) in blocks" :key="block.id" class="panel stack-md">
      <div class="stack-xs">
        <p class="question-index">Q{{ index + 1 }}</p>
        <h3 class="panel__title">{{ block.questionText }}</h3>
        <p class="meta-text">回答数: {{ block.responseCount }}件</p>
      </div>

      <div v-if="block.questionType === 'free_text'" class="stack-sm">
        <p v-if="!block.freeTextAnswers.length" class="empty-state">
          まだ自由記述の回答はありません。
        </p>
        <div
          v-for="(answer, answerIndex) in block.freeTextAnswers"
          :key="`${block.id}-${answerIndex}`"
          class="panel panel--soft"
        >
          {{ answer }}
        </div>
      </div>

      <div v-else class="stack-sm">
        <div v-for="item in block.distribution" :key="item.label" class="results-bar">
          <div class="results-bar__label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
          <div class="results-bar__track">
            <div class="results-bar__fill" :style="{ width: item.width }" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
