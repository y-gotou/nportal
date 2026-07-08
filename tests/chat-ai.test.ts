import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_AI_CONTEXT_MESSAGES,
  buildChatAiMessages,
  extractChatCompletionText,
} from "../server/utils/chat-ai.ts";
import type { ChatMessage } from "../types/portal.ts";

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    scheduleId: 10,
    userEmail: "member@example.com",
    kind: "text",
    body: "こんにちは",
    replyToId: null,
    attachment: null,
    deleted: false,
    createdAt: "2026-06-12 10:00:00",
    ...overrides,
  };
}

const schedule = { title: "RAG入門", date: "2026-06-12" };

test("buildChatAiMessages: テキスト投稿を表示名付きでログに整形する", () => {
  const messages = buildChatAiMessages({
    schedule,
    messages: [
      makeMessage({ id: 1, body: "資料を共有します" }),
      makeMessage({ id: 2, userEmail: "y-gotou@d2sol.co.jp", body: "@AI RAGとは?" }),
    ],
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.role, "system");
  assert.ok(messages[0]?.content.includes("RAG入門"));
  assert.equal(messages[1]?.role, "user");
  assert.ok(messages[1]?.content.includes("member: 資料を共有します"));
  assert.ok(messages[1]?.content.includes("y-gotou: @AI RAGとは?"));
});

test("buildChatAiMessages: スタンプ・削除済み・空本文は除外する", () => {
  const messages = buildChatAiMessages({
    schedule,
    messages: [
      makeMessage({ id: 1, kind: "stamp", body: "👍" }),
      makeMessage({ id: 2, kind: "sticker", body: "naruhodo" }),
      makeMessage({ id: 3, body: "削除前の本文", deleted: true }),
      makeMessage({ id: 4, body: "" }),
      makeMessage({ id: 5, body: "@AI 質問です" }),
    ],
  });

  const log = messages[1]?.content ?? "";
  assert.ok(log.includes("@AI 質問です"));
  assert.ok(!log.includes("👍"));
  assert.ok(!log.includes("naruhodo"));
  assert.ok(!log.includes("削除前の本文"));
});

test("buildChatAiMessages: 直近の件数のみ含める", () => {
  const many = Array.from({ length: CHAT_AI_CONTEXT_MESSAGES + 5 }, (_, index) =>
    makeMessage({ id: index + 1, body: `メッセージ${index + 1}` }),
  );
  const log = buildChatAiMessages({ schedule, messages: many })[1]?.content ?? "";

  assert.ok(!log.includes("メッセージ5\n"));
  assert.ok(log.includes(`メッセージ${CHAT_AI_CONTEXT_MESSAGES + 5}`));
});

test("extractChatCompletionText: 補完本文を取り出す", () => {
  assert.equal(
    extractChatCompletionText({
      choices: [{ message: { content: " RAGは検索拡張生成です。 " } }],
    }),
    "RAGは検索拡張生成です。",
  );
});

test("extractChatCompletionText: 不正な形式や空はnull", () => {
  assert.equal(extractChatCompletionText(null), null);
  assert.equal(extractChatCompletionText({}), null);
  assert.equal(extractChatCompletionText({ choices: [] }), null);
  assert.equal(extractChatCompletionText({ choices: [{ message: { content: "  " } }] }), null);
  assert.equal(extractChatCompletionText({ choices: [{ message: { content: 42 } }] }), null);
});
