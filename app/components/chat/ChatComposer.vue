<script setup lang="ts">
import { Paperclip, Send, SmilePlus, X } from "lucide-vue-next";
import type { ChatMessage } from "~~/types/portal";
import {
  CHAT_EMOJIS,
  CHAT_STICKERS,
  MAX_CHAT_BODY_LENGTH,
  chatDisplayName,
  chatStickerLabel,
  findChatAiMentionCandidate,
} from "~~/utils/chat";

const props = defineProps<{
  sending: boolean;
  replyTo: ChatMessage | null;
}>();

const emit = defineEmits<{
  send: [payload: { kind: "text" | "stamp" | "sticker"; body: string; file: File | null }];
  cancelReply: [];
}>();

const body = ref("");
const file = ref<File | null>(null);
const showStampPicker = ref(false);
const pickerTab = ref<"sticker" | "emoji">("sticker");
const fileInput = ref<HTMLInputElement | null>(null);
const textarea = ref<HTMLTextAreaElement | null>(null);
const stampToggle = ref<HTMLElement | null>(null);
const stampPicker = ref<HTMLElement | null>(null);

useClickOutside(showStampPicker, [stampToggle, stampPicker]);

const canSend = computed(
  () => !props.sending && (body.value.trim().length > 0 || file.value !== null),
);

// 入力量に応じて1行から最大約6行まで自動で高さを広げる
const MAX_TEXTAREA_HEIGHT_PX = 140;

function autoResize() {
  const el = textarea.value;
  if (!el) return;
  el.style.height = "auto";
  // scrollHeightはborderを含まないため、border分を足さないと常に僅かに溢れてスクロールバーが出る
  const borderHeight = el.offsetHeight - el.clientHeight;
  el.style.height = `${Math.min(el.scrollHeight + borderHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
}

watch(body, async () => {
  await nextTick();
  autoResize();
});

onMounted(autoResize);

// @AI メンション候補(カーソル直前に入力途中の @ トークンがあるとき表示)
const mention = ref<{ start: number; query: string } | null>(null);
// Escで閉じた候補の @ 位置。同じトークンの間は再表示しない
const mentionDismissedStart = ref<number | null>(null);

function updateMention(event: Event) {
  const el = textarea.value;
  if (!el || (event as { isComposing?: boolean }).isComposing) return;

  const caret = el.selectionStart ?? body.value.length;
  const candidate = findChatAiMentionCandidate(body.value.slice(0, caret));

  if (!candidate || candidate.start !== mentionDismissedStart.value) {
    mentionDismissedStart.value = null;
  }
  mention.value = candidate && mentionDismissedStart.value === null ? candidate : null;
}

function confirmMention() {
  const el = textarea.value;
  if (!el || !mention.value) return;

  const caret = el.selectionStart ?? body.value.length;
  const before = `${body.value.slice(0, mention.value.start)}@AI `;
  body.value = before + body.value.slice(caret);
  mention.value = null;

  nextTick(() => {
    el.focus();
    el.setSelectionRange(before.length, before.length);
  });
}

function dismissMention() {
  if (!mention.value) return;
  mentionDismissedStart.value = mention.value.start;
  mention.value = null;
}

function onMentionKeydown(event: KeyboardEvent) {
  if (!mention.value || event.isComposing || event.keyCode === 229) return;

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    confirmMention();
  } else if (event.key === "Tab") {
    event.preventDefault();
    confirmMention();
  } else if (event.key === "Escape") {
    event.preventDefault();
    dismissMention();
  }
}

function onKeydown(event: KeyboardEvent) {
  onMentionKeydown(event);
  if (event.key !== "Enter" || event.defaultPrevented) return; // 候補確定に使われたEnterでは送信しない
  // 日本語IMEの変換確定Enterでは送信しない
  if (event.isComposing || event.keyCode === 229) return;
  if (event.shiftKey) return;
  event.preventDefault();
  submit();
}

function submit() {
  if (!canSend.value) return;
  emit("send", { kind: "text", body: body.value, file: file.value });
}

function sendStamp(emoji: string) {
  showStampPicker.value = false;
  if (props.sending) return;
  emit("send", { kind: "stamp", body: emoji, file: null });
}

function sendSticker(id: string) {
  showStampPicker.value = false;
  if (props.sending) return;
  emit("send", { kind: "sticker", body: id, file: null });
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

function clearFile() {
  file.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

// 親が送信完了後に呼び出す
function reset() {
  body.value = "";
  clearFile();
  textarea.value?.focus();
}

defineExpose({ reset });
</script>

<template>
  <div class="border-t border-border bg-surface px-4 py-3">
    <!-- 返信中表示 -->
    <div
      v-if="replyTo"
      class="mb-2 flex items-start justify-between gap-2 rounded-lg border-l-2 border-blue-400 bg-surface-hover px-3 py-1.5 text-xs text-muted"
    >
      <div class="min-w-0">
        <span class="font-medium">{{ chatDisplayName(replyTo.userEmail) }}</span> に返信
        <p class="mt-0.5 line-clamp-1 break-words">
          {{ replyTo.kind === "sticker" ? `スタンプ: ${chatStickerLabel(replyTo.body)}`
            : replyTo.kind === "stamp" ? replyTo.body
            : (replyTo.body || replyTo.attachment?.fileName || "") }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded p-0.5 hover:bg-surface"
        aria-label="返信をやめる"
        @click="emit('cancelReply')"
      >
        <X class="size-4" />
      </button>
    </div>

    <!-- 添付ファイル表示 -->
    <div
      v-if="file"
      class="mb-2 flex items-center justify-between gap-2 rounded-lg bg-surface-hover px-3 py-1.5 text-xs"
    >
      <span class="break-all">{{ file.name }}</span>
      <button
        type="button"
        class="shrink-0 rounded p-0.5 text-muted hover:bg-surface hover:text-foreground"
        aria-label="添付を取り消す"
        @click="clearFile"
      >
        <X class="size-4" />
      </button>
    </div>

    <div class="relative flex items-end gap-2">
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="onFileChange"
      >
      <button
        type="button"
        class="rounded-lg p-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        title="ファイルを添付"
        @click="fileInput?.click()"
      >
        <Paperclip class="size-5" />
      </button>
      <button
        ref="stampToggle"
        type="button"
        class="rounded-lg p-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        title="スタンプ"
        @click="showStampPicker = !showStampPicker"
      >
        <SmilePlus class="size-5" />
      </button>

      <!-- スタンプピッカー(スタンプ/絵文字のタブ切り替え) -->
      <div
        v-if="showStampPicker"
        ref="stampPicker"
        class="absolute bottom-full left-0 z-10 mb-2 w-80 rounded-xl border border-border bg-surface p-2 shadow-lg"
      >
        <div class="mb-2 flex gap-1 border-b border-border pb-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs font-medium transition-colors"
            :class="pickerTab === 'sticker' ? 'bg-blue-500 text-white' : 'text-muted hover:bg-surface-hover'"
            @click="pickerTab = 'sticker'"
          >
            スタンプ
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs font-medium transition-colors"
            :class="pickerTab === 'emoji' ? 'bg-blue-500 text-white' : 'text-muted hover:bg-surface-hover'"
            @click="pickerTab = 'emoji'"
          >
            絵文字
          </button>
        </div>
        <div v-if="pickerTab === 'sticker'" class="grid grid-cols-4 gap-1">
          <button
            v-for="sticker in CHAT_STICKERS"
            :key="sticker.id"
            type="button"
            class="rounded-lg p-1 hover:bg-surface-hover"
            :title="sticker.label"
            @click="sendSticker(sticker.id)"
          >
            <img
              :src="`/stamps/${sticker.id}.png`"
              :alt="sticker.label"
              class="mx-auto size-16"
              loading="lazy"
            >
          </button>
        </div>
        <div v-else class="grid grid-cols-8 gap-1">
          <button
            v-for="emoji in CHAT_EMOJIS"
            :key="emoji"
            type="button"
            class="rounded p-1.5 text-xl hover:bg-surface-hover"
            @click="sendStamp(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <div class="relative min-w-0 flex-1">
        <!-- @AI メンション候補 -->
        <div
          v-if="mention"
          class="absolute bottom-full left-0 z-10 mb-2 w-72 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-left text-sm"
            @pointerdown.prevent
            @click="confirmMention"
          >
            <span class="font-medium text-blue-600 dark:text-blue-400">@AI</span>
            <span class="text-xs text-muted">AI アシスタントに質問(Enterで確定)</span>
          </button>
        </div>

        <textarea
          ref="textarea"
          v-model="body"
          rows="1"
          :maxlength="MAX_CHAT_BODY_LENGTH"
          placeholder="メッセージを入力(Enterで送信、Shift+Enterで改行)"
          class="min-h-0 w-full resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown="onKeydown"
          @input="updateMention"
          @keyup="updateMention"
          @click="updateMention"
          @blur="mention = null"
        />
      </div>
      <button
        type="button"
        class="rounded-lg bg-blue-500 p-2.5 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        title="送信"
        :disabled="!canSend"
        @click="submit"
      >
        <Send class="size-5" />
      </button>
    </div>
  </div>
</template>
