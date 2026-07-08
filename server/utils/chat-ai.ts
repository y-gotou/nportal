import type { H3Event } from "h3";
import type { ChatMessage, D1DatabaseLike } from "../../types/portal.ts";
import { createChatMessage, listChatMessages } from "./chat.ts";
import { llmFetch } from "./llm.ts";
import {
  CHAT_AI_EMAIL,
  MAX_CHAT_BODY_LENGTH,
  chatDisplayName,
} from "../../utils/chat.ts";

// LLM に渡す直近メッセージ数
export const CHAT_AI_CONTEXT_MESSAGES = 20;

export const CHAT_AI_ERROR_BODY =
  "(AI応答の生成に失敗しました。時間をおいて再度お試しください)";

interface ChatCompletionMessage {
  role: "system" | "user";
  content: string;
}

// 直近のテキスト投稿を LLM への入力に整形する(テスト用に純関数として分離)
export function buildChatAiMessages(input: {
  schedule: { title: string; date: string };
  messages: ChatMessage[];
}): ChatCompletionMessage[] {
  const history = input.messages
    .filter((message) => message.kind === "text" && !message.deleted && message.body)
    .slice(-CHAT_AI_CONTEXT_MESSAGES)
    .map((message) => `${chatDisplayName(message.userEmail)}: ${message.body}`)
    .join("\n");

  return [
    {
      role: "system",
      content:
        "あなたは社内AI勉強会ポータルの会議チャットに参加するアシスタントです。" +
        `勉強会「${input.schedule.title}」(${input.schedule.date})のチャットで、` +
        "@AI 宛の質問に日本語で簡潔に回答してください。装飾のないプレーンテキストで出力してください。",
    },
    {
      role: "user",
      content: `これまでのチャットログ:\n${history}\n\n最後の @AI 宛のメッセージに返信してください。`,
    },
  ];
}

// OpenAI 互換のチャット補完レスポンスから本文を取り出す
export function extractChatCompletionText(payload: unknown): string | null {
  const content = (
    payload as { choices?: Array<{ message?: { content?: unknown } }> } | null
  )?.choices?.[0]?.message?.content;

  return typeof content === "string" && content.trim() ? content.trim() : null;
}

// 使用モデル: LLM_CHAT_MODEL があればそれを、なければ /v1/models の先頭を使う
async function resolveChatAiModel(event: H3Event): Promise<string | null> {
  const env = (
    event.context.cloudflare as { env?: Record<string, string | undefined> } | undefined
  )?.env;

  const configured = env?.LLM_CHAT_MODEL?.trim();
  if (configured) return configured;

  const upstream = await llmFetch(event, "/v1/models");
  if (!upstream.ok) return null;

  const payload = (await upstream.json()) as { data?: Array<{ id?: unknown }> } | null;
  const id = payload?.data?.[0]?.id;
  return typeof id === "string" ? id : null;
}

// @AI メンションへの返信を生成してチャットに投稿する(messages.post.ts からバックグラウンド実行)
export async function postChatAiReply(
  event: H3Event,
  db: D1DatabaseLike,
  input: {
    scheduleId: number;
    schedule: { title: string; date: string };
    replyToId: number | null;
  },
): Promise<void> {
  let body: string;

  try {
    const model = await resolveChatAiModel(event);
    if (!model) throw new Error("chat model is not available.");

    const messages = buildChatAiMessages({
      schedule: input.schedule,
      messages: await listChatMessages(db, input.scheduleId),
    });

    const upstream = await llmFetch(event, "/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, max_tokens: 1024 }),
    });
    if (!upstream.ok) throw new Error(`upstream returned ${upstream.status}`);

    const text = extractChatCompletionText(await upstream.json());
    if (!text) throw new Error("completion text is empty.");

    body = text.slice(0, MAX_CHAT_BODY_LENGTH);
  } catch (error) {
    console.error("chat AI reply failed:", error);
    body = CHAT_AI_ERROR_BODY;
  }

  await createChatMessage(db, {
    scheduleId: input.scheduleId,
    userEmail: CHAT_AI_EMAIL,
    kind: "text",
    body,
    replyToId: input.replyToId,
    attachment: null,
  });
}
