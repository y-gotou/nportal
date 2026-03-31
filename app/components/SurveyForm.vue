<script setup lang="ts">
import type { Survey } from "~~/types/portal";

const props = defineProps<{
  survey: Survey;
}>();

const answers = ref<Record<number, string>>({});
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref("");

function getMultipleAnswers(questionId: number) {
  try {
    return JSON.parse(answers.value[questionId] ?? "[]") as string[];
  } catch {
    return [];
  }
}

function toggleMultipleAnswer(questionId: number, option: string) {
  const selected = getMultipleAnswers(questionId);
  const next = selected.includes(option)
    ? selected.filter((item) => item !== option)
    : [...selected, option];

  answers.value = {
    ...answers.value,
    [questionId]: JSON.stringify(next),
  };
}

async function submitSurvey() {
  errorMessage.value = "";
  isSubmitting.value = true;

  try {
    await $fetch("/api/survey", {
      method: "POST",
      body: {
        surveyId: props.survey.id,
        responses: props.survey.questions.map((question) => ({
          questionId: question.id,
          answer: answers.value[question.id] ?? "",
        })),
      },
    });

    isSubmitted.value = true;
  } catch {
    errorMessage.value = "送信に失敗しました。時間をおいて再度お試しください。";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isSubmitted" class="panel panel--success stack-md">
    <h2 class="panel__title">回答ありがとうございました</h2>
    <p class="section-header__description">
      回答は保存されました。結果ページから集計を確認できます。
    </p>
    <div class="button-row">
      <NuxtLink :to="`/survey/${survey.id}/results`" class="button button--primary">
        結果を見る
      </NuxtLink>
      <NuxtLink to="/survey" class="button button--secondary">
        一覧へ戻る
      </NuxtLink>
    </div>
  </div>

  <form v-else class="stack-lg" @submit.prevent="submitSurvey">
    <section
      v-for="(question, index) in survey.questions"
      :key="question.id"
      class="panel stack-md"
    >
      <div class="stack-xs">
        <p class="question-index">Q{{ index + 1 }}</p>
        <h3 class="panel__title">{{ question.questionText }}</h3>
      </div>

      <div v-if="question.questionType === 'single_choice'" class="choice-list">
        <label v-for="option in question.options" :key="option" class="choice-item">
          <input
            :name="`question-${question.id}`"
            type="radio"
            :value="option"
            :checked="answers[question.id] === option"
            @change="answers = { ...answers, [question.id]: option }"
          >
          <span>{{ option }}</span>
        </label>
      </div>

      <div v-else-if="question.questionType === 'multiple_choice'" class="choice-list">
        <label v-for="option in question.options" :key="option" class="choice-item">
          <input
            type="checkbox"
            :checked="getMultipleAnswers(question.id).includes(option)"
            @change="toggleMultipleAnswer(question.id, option)"
          >
          <span>{{ option }}</span>
        </label>
      </div>

      <textarea
        v-else
        :value="answers[question.id] ?? ''"
        class="form-textarea"
        rows="5"
        placeholder="自由にご記入ください"
        @input="
          answers = {
            ...answers,
            [question.id]: ($event.target as HTMLTextAreaElement).value,
          }
        "
      />
    </section>

    <p v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </p>

    <button class="button button--primary button--wide" type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? "送信中..." : "回答を送信" }}
    </button>
  </form>
</template>
