<script setup lang="ts">
import type { ChatMessage, ChatReaction } from "~~/types/portal";

const props = defineProps<{
  messages: ChatMessage[];
  reactions: ChatReaction[];
  ownEmail: string;
  isAdmin: boolean;
  readOnly: boolean;
}>();

const emit = defineEmits<{
  react: [messageId: number, emoji: string];
  reply: [message: ChatMessage];
  remove: [messageId: number];
  imageClick: [src: string, fileName: string];
}>();

const container = ref<HTMLElement | null>(null);
const atBottom = ref(true);

const visibleMessages = computed(() => props.messages.filter((message) => !message.deleted));

const messagesById = computed(() => {
  const map = new Map<number, ChatMessage>();
  for (const message of props.messages) map.set(message.id, message);
  return map;
});

const reactionsByMessageId = computed(() => {
  const map = new Map<number, ChatReaction[]>();
  for (const reaction of props.reactions) {
    const list = map.get(reaction.messageId);
    if (list) {
      list.push(reaction);
    } else {
      map.set(reaction.messageId, [reaction]);
    }
  }
  return map;
});

function onScroll() {
  const el = container.value;
  if (!el) return;
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}

function scrollToBottom(behavior: ScrollBehavior = "smooth") {
  const el = container.value;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
}

// 新着時、最下部付近にいる場合のみ自動スクロール
watch(
  () => visibleMessages.value.length,
  async (next, prev) => {
    if (next <= prev || !atBottom.value) return;
    await nextTick();
    scrollToBottom();
  },
);

defineExpose({ scrollToBottom });

function canDelete(message: ChatMessage): boolean {
  if (props.isAdmin) return true;
  return !props.readOnly && message.userEmail === props.ownEmail;
}
</script>

<template>
  <div
    ref="container"
    class="flex-1 space-y-4 overflow-y-auto px-4 py-5"
    @scroll.passive="onScroll"
  >
    <p v-if="!visibleMessages.length" class="py-10 text-center text-sm text-muted">
      まだ投稿はありません。
    </p>
    <ChatMessageItem
      v-for="message in visibleMessages"
      :key="message.id"
      :message="message"
      :quote="message.replyToId ? messagesById.get(message.replyToId) ?? null : null"
      :reactions="reactionsByMessageId.get(message.id) ?? []"
      :own-email="ownEmail"
      :is-own="message.userEmail === ownEmail"
      :can-delete="canDelete(message)"
      :read-only="readOnly"
      @react="(emoji) => emit('react', message.id, emoji)"
      @reply="emit('reply', message)"
      @remove="emit('remove', message.id)"
      @image-click="(src, fileName) => emit('imageClick', src, fileName)"
    />
  </div>
</template>
