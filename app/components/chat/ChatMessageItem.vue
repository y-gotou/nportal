<script setup lang="ts">
import { FileText, Reply, SmilePlus, Trash2 } from "lucide-vue-next";
import type { ChatMessage, ChatReaction } from "~~/types/portal";
import {
  CHAT_EMOJIS,
  CHAT_QUICK_REACTION_EMOJIS,
  chatDisplayName,
  chatStickerLabel,
  formatChatTime,
  isChatStickerId,
  splitChatBody,
} from "~~/utils/chat";

const props = defineProps<{
  message: ChatMessage;
  quote: ChatMessage | null;
  reactions: ChatReaction[];
  ownEmail: string;
  isOwn: boolean;
  canDelete: boolean;
  readOnly: boolean;
}>();

const emit = defineEmits<{
  react: [emoji: string];
  reply: [];
  remove: [];
  imageClick: [src: string, fileName: string];
}>();

const showPicker = ref(false);
const reactionToggle = ref<HTMLElement | null>(null);
const reactionPicker = ref<HTMLElement | null>(null);

useClickOutside(showPicker, [reactionToggle, reactionPicker]);

const bodyParts = computed(() => splitChatBody(props.message.body));
const fileUrl = computed(() => `/api/chat/messages/${props.message.id}/file`);

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  if (size >= 1024) return `${Math.round(size / 1024)}KB`;
  return `${size}B`;
}

function hasOwnReaction(reaction: ChatReaction): boolean {
  return reaction.userEmails.includes(props.ownEmail);
}

function pickEmoji(emoji: string) {
  showPicker.value = false;
  emit("react", emoji);
}
</script>

<template>
  <div class="group flex" :class="isOwn ? 'justify-end' : 'justify-start'">
    <div class="max-w-[85%] sm:max-w-[70%]">
      <p
        v-if="!isOwn"
        class="mb-1 text-xs text-muted"
        :title="message.userEmail"
      >
        {{ chatDisplayName(message.userEmail) }}
      </p>

      <div class="flex items-end gap-2" :class="isOwn ? 'flex-row-reverse' : ''">
        <!-- 本文 -->
        <div v-if="message.kind === 'stamp'" class="text-5xl leading-none">
          {{ message.body }}
        </div>
        <img
          v-else-if="message.kind === 'sticker' && isChatStickerId(message.body)"
          :src="`/stamps/${message.body}.png`"
          :alt="chatStickerLabel(message.body)"
          class="size-32"
        >
        <div
          v-else
          class="rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm"
          :class="isOwn
            ? 'rounded-br-md bg-blue-500 text-white'
            : 'rounded-bl-md border border-border bg-surface text-foreground'"
        >
          <!-- 引用 -->
          <div
            v-if="message.replyToId"
            class="mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs"
            :class="isOwn ? 'border-white/40 bg-white/10 text-white/80' : 'border-blue-300 bg-surface-hover text-muted'"
          >
            <template v-if="quote && !quote.deleted">
              <span class="font-medium">{{ chatDisplayName(quote.userEmail) }}</span>
              <p class="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">
                {{ quote.kind === "sticker" ? `スタンプ: ${chatStickerLabel(quote.body)}`
                  : quote.kind === "stamp" ? quote.body
                  : (quote.body || quote.attachment?.fileName || "") }}
              </p>
            </template>
            <p v-else>削除された投稿</p>
          </div>

          <p v-if="message.body" class="whitespace-pre-wrap break-words">
            <template v-for="(part, index) in bodyParts" :key="index">
              <a
                v-if="part.type === 'link'"
                :href="part.value"
                target="_blank"
                rel="noreferrer"
                class="underline"
                :class="isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'"
              >{{ part.value }}</a>
              <template v-else>{{ part.value }}</template>
            </template>
          </p>

          <!-- 添付 -->
          <template v-if="message.attachment">
            <!-- bg-white: 透過画像が吹き出しの背景色を拾わないようにする -->
            <img
              v-if="message.attachment.isImage"
              :src="fileUrl"
              :alt="message.attachment.fileName"
              class="mt-1 max-h-60 max-w-full cursor-zoom-in rounded-lg bg-white"
              loading="lazy"
              @click="emit('imageClick', fileUrl, message.attachment.fileName)"
            >
            <a
              v-else
              :href="fileUrl"
              target="_blank"
              rel="noreferrer"
              class="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs underline"
              :class="isOwn ? 'bg-white/10 text-white' : 'bg-surface-hover text-foreground'"
            >
              <FileText class="size-4 shrink-0" />
              <span class="break-all">{{ message.attachment.fileName }}</span>
              <span class="shrink-0" :class="isOwn ? 'text-white/70' : 'text-muted'">
                {{ formatFileSize(message.attachment.fileSize) }}
              </span>
            </a>
          </template>
        </div>

        <!-- 時刻+ホバー操作 -->
        <div class="flex shrink-0 flex-col items-center gap-1 pb-0.5" :class="isOwn ? 'items-end' : 'items-start'">
          <div
            v-if="!readOnly || canDelete"
            class="relative flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <template v-if="!readOnly">
              <button
                v-for="emoji in CHAT_QUICK_REACTION_EMOJIS"
                :key="emoji"
                type="button"
                class="rounded p-0.5 text-sm hover:bg-surface-hover"
                :title="`${emoji} でリアクション`"
                @click="emit('react', emoji)"
              >
                {{ emoji }}
              </button>
              <button
                ref="reactionToggle"
                type="button"
                class="rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground"
                title="その他のリアクション"
                @click="showPicker = !showPicker"
              >
                <SmilePlus class="size-4" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground"
                title="返信"
                @click="emit('reply')"
              >
                <Reply class="size-4" />
              </button>
            </template>
            <button
              v-if="canDelete"
              type="button"
              class="rounded p-1 text-muted hover:bg-surface-hover hover:text-red-500"
              title="削除"
              @click="emit('remove')"
            >
              <Trash2 class="size-4" />
            </button>

            <!-- リアクションピッカー -->
            <div
              v-if="showPicker"
              ref="reactionPicker"
              class="absolute bottom-full z-10 mb-1 grid w-56 grid-cols-8 gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg"
              :class="isOwn ? 'right-0' : 'left-0'"
            >
              <button
                v-for="emoji in CHAT_EMOJIS"
                :key="emoji"
                type="button"
                class="rounded p-1 text-base hover:bg-surface-hover"
                @click="pickEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
          <time class="text-[11px] text-muted">{{ formatChatTime(message.createdAt) }}</time>
        </div>
      </div>

      <!-- リアクション表示 -->
      <div
        v-if="reactions.length"
        class="mt-1 flex flex-wrap gap-1"
        :class="isOwn ? 'justify-end' : 'justify-start'"
      >
        <button
          v-for="reaction in reactions"
          :key="reaction.emoji"
          type="button"
          class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors"
          :class="hasOwnReaction(reaction)
            ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            : 'border-border bg-surface text-muted hover:bg-surface-hover'"
          :disabled="readOnly"
          :title="reaction.userEmails.map(chatDisplayName).join('、')"
          @click="emit('react', reaction.emoji)"
        >
          <span>{{ reaction.emoji }}</span>
          <span>{{ reaction.userEmails.length }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
