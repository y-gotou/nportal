<script setup lang="ts">
import type { NewsArticle, NewsVoteResponse, NewsVoteValue } from "~~/types/portal";

const props = defineProps<{
  article: NewsArticle;
}>();

const upCount = ref(props.article.upCount);
const downCount = ref(props.article.downCount);
const myVote = ref<NewsVoteValue>(props.article.myVote);
const isSending = ref(false);
const hasFailed = ref(false);

// 日付切り替えなどで記事が差し替わったときに追従する
watch(
  () => props.article,
  (article) => {
    upCount.value = article.upCount;
    downCount.value = article.downCount;
    myVote.value = article.myVote;
  },
);

function applyLocally(next: NewsVoteValue) {
  if (myVote.value === 1) upCount.value -= 1;
  if (myVote.value === -1) downCount.value -= 1;
  if (next === 1) upCount.value += 1;
  if (next === -1) downCount.value += 1;
  myVote.value = next;
}

// 同じボタンをもう一度押すと取り消し、逆のボタンを押すと入れ替え
async function vote(value: 1 | -1) {
  if (isSending.value) return;

  const next: NewsVoteValue = myVote.value === value ? 0 : value;
  const snapshot = { up: upCount.value, down: downCount.value, mine: myVote.value };

  applyLocally(next);
  isSending.value = true;
  hasFailed.value = false;

  try {
    const result = await $fetch<NewsVoteResponse>(`/api/news/${props.article.id}/vote`, {
      method: "POST",
      body: { value: next },
    });
    upCount.value = result.upCount;
    downCount.value = result.downCount;
    myVote.value = result.myVote;
  } catch {
    upCount.value = snapshot.up;
    downCount.value = snapshot.down;
    myVote.value = snapshot.mine;
    hasFailed.value = true;
  } finally {
    isSending.value = false;
  }
}

const buttonClass = (active: boolean) =>
  [
    "rounded-md px-2 py-1 text-xs tabular-nums transition-colors disabled:cursor-default",
    active
      ? "bg-surface-hover font-semibold text-foreground"
      : "text-muted hover:bg-surface-hover hover:text-foreground",
  ].join(" ");
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      :class="buttonClass(myVote === 1)"
      :aria-pressed="myVote === 1"
      :aria-label="myVote === 1 ? '高評価を取り消す' : '高評価する'"
      :disabled="isSending"
      @click="vote(1)"
    >
      👍 {{ upCount }}
    </button>
    <button
      type="button"
      :class="buttonClass(myVote === -1)"
      :aria-pressed="myVote === -1"
      :aria-label="myVote === -1 ? '低評価を取り消す' : '低評価する'"
      :disabled="isSending"
      @click="vote(-1)"
    >
      👎 {{ downCount }}
    </button>
    <span v-if="hasFailed" role="alert" class="text-xs text-red-600 dark:text-red-400">
      評価を保存できませんでした
    </span>
  </div>
</template>
