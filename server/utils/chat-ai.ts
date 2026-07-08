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

// Web 検索の取得件数と、LLM に渡す抜粋の最大文字数
export const CHAT_AI_SEARCH_MAX_RESULTS = 5;
export const CHAT_AI_SEARCH_SNIPPET_LENGTH = 500;

export const CHAT_AI_ERROR_BODY =
  "(AI応答の生成に失敗しました。時間をおいて再度お試しください)";

interface ChatCompletionMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatAiSearchResult {
  title: string;
  url: string;
  content: string;
}

function formatChatHistory(messages: ChatMessage[]): string {
  return messages
    .filter((message) => message.kind === "text" && !message.deleted && message.body)
    .slice(-CHAT_AI_CONTEXT_MESSAGES)
    .map((message) => `${chatDisplayName(message.userEmail)}: ${message.body}`)
    .join("\n");
}

// 直近のテキスト投稿を LLM への入力に整形する(テスト用に純関数として分離)
export function buildChatAiMessages(input: {
  schedule: { title: string; date: string };
  messages: ChatMessage[];
  searchResults?: ChatAiSearchResult[] | null;
}): ChatCompletionMessage[] {
  const sections = [`これまでのチャットログ:\n${formatChatHistory(input.messages)}`];
  let instruction = "最後の @AI 宛のメッセージに返信してください。";

  if (input.searchResults?.length) {
    const block = input.searchResults
      .map((result, index) => `[${index + 1}] ${result.title}\n${result.url}\n${result.content}`)
      .join("\n\n");
    sections.push(`Web検索結果:\n${block}`);
    instruction =
      "最後の @AI 宛のメッセージに、Web検索結果を参考にして返信してください。" +
      "参考にした情報源のURLを回答の末尾に記載してください。";
  }

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
      content: `${sections.join("\n\n")}\n\n${instruction}`,
    },
  ];
}

// Web 検索の要否判定用の入力を整形する(テスト用に純関数として分離)
export function buildSearchJudgeMessages(input: {
  messages: ChatMessage[];
}): ChatCompletionMessage[] {
  return [
    {
      role: "system",
      content:
        "あなたはWeb検索の要否を判定する分類器です。指定された形式のJSONのみを出力してください。",
    },
    {
      role: "user",
      content:
        `チャットログ:\n${formatChatHistory(input.messages)}\n\n` +
        "最後の @AI 宛のメッセージに正確に答えるために、最新情報や外部情報のWeb検索が必要か判定してください。" +
        '必要な場合は {"query": "検索クエリ"}、不要な場合は {"query": null} のJSONのみを出力してください。',
    },
  ];
}

// 判定呼び出しの出力から検索クエリを取り出す。解析できない場合は null(検索なしにフォールバック)
export function extractSearchQuery(text: string | null): string | null {
  if (!text) return null;

  const match = /\{[^{}]*\}/.exec(text);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as { query?: unknown };
    const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
    if (!query || query.toLowerCase() === "null") return null;
    return query.slice(0, 200);
  } catch {
    return null;
  }
}

// OpenAI 互換のチャット補完レスポンスから本文を取り出す
export function extractChatCompletionText(payload: unknown): string | null {
  const content = (
    payload as { choices?: Array<{ message?: { content?: unknown } }> } | null
  )?.choices?.[0]?.message?.content;

  return typeof content === "string" && content.trim() ? content.trim() : null;
}

function getCloudflareEnv(event: H3Event): Record<string, string | undefined> | undefined {
  return (
    event.context.cloudflare as { env?: Record<string, string | undefined> } | undefined
  )?.env;
}

// 使用モデル: LLM_CHAT_MODEL があればそれを、なければ /v1/models の先頭を使う
async function resolveChatAiModel(event: H3Event): Promise<string | null> {
  const configured = getCloudflareEnv(event)?.LLM_CHAT_MODEL?.trim();
  if (configured) return configured;

  const upstream = await llmFetch(event, "/v1/models");
  if (!upstream.ok) return null;

  const payload = (await upstream.json()) as { data?: Array<{ id?: unknown }> } | null;
  const id = payload?.data?.[0]?.id;
  return typeof id === "string" ? id : null;
}

async function llmChatCompletion(
  event: H3Event,
  model: string,
  messages: ChatCompletionMessage[],
  maxTokens: number,
): Promise<string | null> {
  const upstream = await llmFetch(event, "/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, max_tokens: maxTokens }),
  });
  if (!upstream.ok) throw new Error(`upstream returned ${upstream.status}`);

  return extractChatCompletionText(await upstream.json());
}

async function searchTavily(apiKey: string, query: string): Promise<ChatAiSearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, max_results: CHAT_AI_SEARCH_MAX_RESULTS }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`tavily returned ${response.status}`);

  const payload = (await response.json()) as {
    results?: Array<{ title?: unknown; url?: unknown; content?: unknown }>;
  } | null;

  return (payload?.results ?? [])
    .filter((result) => typeof result.url === "string")
    .map((result) => ({
      title: typeof result.title === "string" ? result.title : "",
      url: result.url as string,
      content:
        typeof result.content === "string"
          ? result.content.slice(0, CHAT_AI_SEARCH_SNIPPET_LENGTH)
          : "",
    }));
}

// 質問内容から LLM が要否を判定し、必要なら Tavily で Web 検索する。
// キー未設定・判定不能・検索失敗はすべて「検索なし」にフォールバックする
async function maybeSearchWeb(
  event: H3Event,
  model: string,
  history: ChatMessage[],
): Promise<ChatAiSearchResult[] | null> {
  const apiKey = getCloudflareEnv(event)?.TAVILY_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const judgeText = await llmChatCompletion(
      event,
      model,
      buildSearchJudgeMessages({ messages: history }),
      200,
    );
    const query = extractSearchQuery(judgeText);
    if (!query) return null;

    const results = await searchTavily(apiKey, query);
    return results.length ? results : null;
  } catch (error) {
    console.error("chat AI web search skipped:", error);
    return null;
  }
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

    const history = await listChatMessages(db, input.scheduleId);
    const searchResults = await maybeSearchWeb(event, model, history);

    const text = await llmChatCompletion(
      event,
      model,
      buildChatAiMessages({ schedule: input.schedule, messages: history, searchResults }),
      1024,
    );
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
