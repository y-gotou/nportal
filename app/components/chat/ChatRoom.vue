<script setup lang="ts">
import { Lock } from "lucide-vue-next";
import type {
  ChatMessage,
  ChatMessagesResponse,
  ChatReaction,
  ChatRoomInfo,
} from "~~/types/portal";
import { hasChatAiMention } from "~~/utils/chat";
import { formatDisplayDateTime } from "~~/utils/content";
import { useCurrentUser } from "~/composables/useCurrentUser";

const props = defineProps<{
  scheduleId: number;
}>();

const POLL_INTERVAL_MS = 3000;

const currentUser = useCurrentUser();

const room = ref<ChatRoomInfo | null>(null);
const messages = ref<ChatMessage[]>([]);
const reactions = ref<ChatReaction[]>([]);
const version = ref<number | null>(null);
const loading = ref(true);
const notFound = ref(false);
const errorMessage = ref("");
const sending = ref(false);
const aiReplyPending = ref(false);
const replyTo = ref<ChatMessage | null>(null);
const modalImage = ref<{ src: string; fileName: string } | null>(null);

const listRef = ref<InstanceType<typeof import("./ChatMessageList.vue").default> | null>(null);
const composerRef = ref<InstanceType<typeof import("./ChatComposer.vue").default> | null>(null);

let timer: ReturnType<typeof setInterval> | null = null;
let pollInFlight = false;

function applyResponse(data: ChatMessagesResponse) {
  version.value = data.version;
  room.value = data.room;
  reactions.value = data.reactions;

  const knownIds = new Set(messages.value.map((message) => message.id));
  for (const message of data.messages) {
    if (!knownIds.has(message.id)) {
      messages.value.push(message);
    }
  }

  const deletedIds = new Set(data.deletedMessageIds);
  for (const message of messages.value) {
    if (!message.deleted && deletedIds.has(message.id)) {
      message.deleted = true;
      message.body = "";
      message.attachment = null;
    }
  }
}

async function poll() {
  if (pollInFlight) return;
  pollInFlight = true;

  try {
    const query: Record<string, number> = {};
    if (version.value !== null) query.version = version.value;
    const lastId = messages.value[messages.value.length - 1]?.id;
    if (lastId) query.after = lastId;

    const response = await $fetch.raw<ChatMessagesResponse>(
      `/api/chat/${props.scheduleId}/messages`,
      { query },
    );

    if (response.status !== 204 && response._data) {
      applyResponse(response._data);
    }
    errorMessage.value = "";
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      notFound.value = true;
      stopPolling();
    }
  } finally {
    pollInFlight = false;
    loading.value = false;
  }
}

function startPolling() {
  if (timer) return;
  timer = setInterval(poll, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// タブ非表示中はポーリングを停止して通信を抑える
function onVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    void poll();
    startPolling();
  }
}

onMounted(async () => {
  await poll();
  await nextTick();
  listRef.value?.scrollToBottom("instant");
  startPolling();
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onUnmounted(() => {
  stopPolling();
  document.removeEventListener("visibilitychange", onVisibilityChange);
});

async function sendMessage(payload: { kind: "text" | "stamp" | "sticker"; body: string; file: File | null }) {
  if (sending.value) return;
  sending.value = true;
  errorMessage.value = "";

  try {
    const form = new FormData();
    form.set("kind", payload.kind);
    form.set("body", payload.body);
    if (replyTo.value) form.set("replyToId", String(replyTo.value.id));
    if (payload.file) form.append("file", payload.file);

    const result = await $fetch<{ ok: boolean; messageId: number | null }>(
      `/api/chat/${props.scheduleId}/messages`,
      { method: "POST", body: form },
    );

    replyTo.value = null;
    composerRef.value?.reset();
    await poll();
    listRef.value?.scrollToBottom();

    // @AI メンションにはサーバーへ返信生成を依頼する(生成完了はポーリングで反映)
    if (payload.kind === "text" && hasChatAiMention(payload.body) && result.messageId) {
      void requestAiReply(result.messageId);
    }
  } catch (error) {
    errorMessage.value =
      (error as { statusCode?: number }).statusCode === 403
        ? "このチャットは読み取り専用になりました。"
        : "送信に失敗しました。時間をおいて再度お試しください。";
  } finally {
    sending.value = false;
  }
}

// AI 返信の生成をサーバーに依頼する。LLM 生成に数分かかることがあるため送信状態とは分離し、
// このリクエストが完了するまでタブを開いたままにする必要がある
async function requestAiReply(messageId: number) {
  aiReplyPending.value = true;
  try {
    await $fetch(`/api/chat/${props.scheduleId}/ai-reply`, {
      method: "POST",
      body: { messageId },
      timeout: 300_000,
    });
    await poll();
    listRef.value?.scrollToBottom();
  } catch {
    errorMessage.value = "AI応答の生成リクエストに失敗しました。";
  } finally {
    aiReplyPending.value = false;
  }
}

async function removeMessage(messageId: number) {
  if (!window.confirm("この投稿を削除しますか?")) return;

  try {
    await $fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" });
    await poll();
  } catch {
    errorMessage.value = "削除に失敗しました。";
  }
}

async function toggleReaction(messageId: number, emoji: string) {
  try {
    await $fetch(`/api/chat/messages/${messageId}/reactions`, {
      method: "PUT",
      body: { emoji },
    });
    await poll();
  } catch {
    errorMessage.value = "リアクションに失敗しました。";
  }
}

function setReplyTo(message: ChatMessage) {
  replyTo.value = message;
}
</script>

<template>
  <div class="flex h-full flex-col">
    <p v-if="notFound" class="rounded-xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
      この会議は見つかりませんでした。
      <NuxtLink to="/schedule" class="text-blue-600 underline dark:text-blue-400">スケジュールへ戻る</NuxtLink>
    </p>

    <template v-else>
      <!-- ヘッダー -->
      <div class="flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div class="min-w-0">
          <h1 class="truncate text-base font-semibold tracking-tight text-foreground">
            {{ room?.title ?? "チャット" }}
          </h1>
          <p v-if="room" class="text-xs text-muted">
            {{ formatDisplayDateTime(room.date, room.time) }}
          </p>
        </div>
        <span
          v-if="room?.readOnly"
          class="flex shrink-0 items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted"
        >
          <Lock class="size-3.5" />
          読み取り専用
        </span>
      </div>

      <!-- メッセージ一覧 -->
      <p v-if="loading" class="flex-1 py-10 text-center text-sm text-muted">読み込み中...</p>
      <ChatMessageList
        v-else
        ref="listRef"
        :messages="messages"
        :reactions="reactions"
        :own-email="currentUser?.email ?? ''"
        :is-admin="currentUser?.isAdmin === true"
        :read-only="room?.readOnly !== false"
        @react="toggleReaction"
        @reply="setReplyTo"
        @remove="removeMessage"
        @image-click="(src, fileName) => (modalImage = { src, fileName })"
      />

      <p v-if="errorMessage" class="border-t border-border bg-red-50 px-4 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {{ errorMessage }}
      </p>

      <p v-if="aiReplyPending" class="border-t border-border bg-surface px-4 py-2 text-xs text-muted">
        AI アシスタントが返信を作成中です(数分かかることがあります)…
      </p>

      <!-- 入力欄(読み取り専用時は非表示) -->
      <ChatComposer
        v-if="room && !room.readOnly"
        ref="composerRef"
        :sending="sending"
        :reply-to="replyTo"
        @send="sendMessage"
        @cancel-reply="replyTo = null"
      />
    </template>

    <ChatImageModal
      v-if="modalImage"
      :src="modalImage.src"
      :file-name="modalImage.fileName"
      @close="modalImage = null"
    />
  </div>
</template>
