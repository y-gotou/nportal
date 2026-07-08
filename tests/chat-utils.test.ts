import assert from "node:assert/strict";
import test from "node:test";
import {
  parseChatId,
  toChatMessage,
  validateChatMessageBody,
  type ChatMessageRow,
} from "../server/utils/chat.ts";
import {
  CHAT_AI_DISPLAY_NAME,
  CHAT_AI_EMAIL,
  MAX_CHAT_BODY_LENGTH,
  chatDisplayName,
  chatStickerLabel,
  findChatAiMentionCandidate,
  hasChatAiMention,
  isChatEmoji,
  isChatImageMimeType,
  isChatReadOnly,
  isChatStickerId,
  splitChatBody,
} from "../utils/chat.ts";

const baseRow: ChatMessageRow = {
  id: 1,
  schedule_id: 10,
  user_email: "y-gotou@d2sol.co.jp",
  kind: "text",
  body: "こんにちは",
  reply_to_id: null,
  file_key: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  deleted_at: null,
  created_at: "2026-06-12 10:00:00",
};

test("isChatReadOnly: 会議日当日は投稿可能、翌日以降は読み取り専用", () => {
  assert.equal(isChatReadOnly("2026-06-12", "2026-06-11"), false);
  assert.equal(isChatReadOnly("2026-06-12", "2026-06-12"), false);
  assert.equal(isChatReadOnly("2026-06-12", "2026-06-13"), true);
});

test("isChatEmoji: プリセットのみ許可", () => {
  assert.equal(isChatEmoji("👍"), true);
  assert.equal(isChatEmoji("🦄"), false);
  assert.equal(isChatEmoji("<script>"), false);
});

test("isChatImageMimeType: 画像MIMEのみtrue", () => {
  assert.equal(isChatImageMimeType("image/png"), true);
  assert.equal(isChatImageMimeType("IMAGE/JPEG; charset=binary"), true);
  assert.equal(isChatImageMimeType("application/pdf"), false);
  assert.equal(isChatImageMimeType(null), false);
});

test("parseChatId: 正の整数のみ許可", () => {
  assert.equal(parseChatId("3", "bad id"), 3);
  assert.throws(() => parseChatId("0", "bad id"));
  assert.throws(() => parseChatId("abc", "bad id"));
  assert.throws(() => parseChatId("1.5", "bad id"));
});

test("toChatMessage: 通常メッセージを変換する", () => {
  const message = toChatMessage(baseRow);
  assert.equal(message.id, 1);
  assert.equal(message.scheduleId, 10);
  assert.equal(message.kind, "text");
  assert.equal(message.body, "こんにちは");
  assert.equal(message.deleted, false);
  assert.equal(message.attachment, null);
});

test("toChatMessage: 添付付きメッセージはattachmentを返す", () => {
  const message = toChatMessage({
    ...baseRow,
    file_key: "local/chat/abc.png",
    file_name: "screenshot.png",
    file_size: 1234,
    mime_type: "image/png",
  });
  assert.deepEqual(message.attachment, {
    fileName: "screenshot.png",
    fileSize: 1234,
    mimeType: "image/png",
    isImage: true,
  });
});

test("toChatMessage: 削除済みは本文と添付を伏せる", () => {
  const message = toChatMessage({
    ...baseRow,
    file_key: "local/chat/abc.png",
    file_name: "screenshot.png",
    deleted_at: "2026-06-12 11:00:00",
  });
  assert.equal(message.deleted, true);
  assert.equal(message.body, "");
  assert.equal(message.attachment, null);
});

test("validateChatMessageBody: テキストはtrimして返す", () => {
  assert.equal(
    validateChatMessageBody({ kind: "text", body: "  hello  ", hasAttachment: false }),
    "hello",
  );
});

test("validateChatMessageBody: 空テキストは添付がなければエラー", () => {
  assert.throws(() =>
    validateChatMessageBody({ kind: "text", body: "   ", hasAttachment: false }),
  );
  assert.equal(
    validateChatMessageBody({ kind: "text", body: "", hasAttachment: true }),
    "",
  );
});

test("validateChatMessageBody: 最大文字数を超えるとエラー", () => {
  const long = "a".repeat(MAX_CHAT_BODY_LENGTH + 1);
  assert.throws(() =>
    validateChatMessageBody({ kind: "text", body: long, hasAttachment: false }),
  );
});

test("splitChatBody: URLをリンクパートに分割する", () => {
  assert.deepEqual(splitChatBody("資料は https://example.com/a?b=1 です"), [
    { type: "text", value: "資料は " },
    { type: "link", value: "https://example.com/a?b=1" },
    { type: "text", value: " です" },
  ]);
  assert.deepEqual(splitChatBody("リンクなし"), [{ type: "text", value: "リンクなし" }]);
  // http(s)以外はリンク化しない
  assert.deepEqual(splitChatBody("javascript:alert(1)"), [
    { type: "text", value: "javascript:alert(1)" },
  ]);
});

test("chatDisplayName: メールのローカル部を返す", () => {
  assert.equal(chatDisplayName("y-gotou@d2sol.co.jp"), "y-gotou");
  assert.equal(chatDisplayName("invalid"), "invalid");
});

test("chatDisplayName: AIアシスタントは専用の表示名を返す", () => {
  assert.equal(chatDisplayName(CHAT_AI_EMAIL), CHAT_AI_DISPLAY_NAME);
});

test("findChatAiMentionCandidate: 入力途中の@AI候補を検出する", () => {
  assert.deepEqual(findChatAiMentionCandidate("@"), { start: 0, query: "" });
  assert.deepEqual(findChatAiMentionCandidate("こんにちは @A"), { start: 6, query: "A" });
  assert.deepEqual(findChatAiMentionCandidate("どうですか?@a"), { start: 6, query: "a" });
  // 2つ目の@トークンを対象にする
  assert.deepEqual(findChatAiMentionCandidate("@AI テスト @"), { start: 8, query: "" });
});

test("findChatAiMentionCandidate: 対象外の入力には候補を出さない", () => {
  // 入力が完成している場合は候補を出さない
  assert.equal(findChatAiMentionCandidate("@AI"), null);
  assert.equal(findChatAiMentionCandidate("@ai"), null);
  // AIの前方一致でない
  assert.equal(findChatAiMentionCandidate("@x"), null);
  // メールアドレス等(直前が英数字)
  assert.equal(findChatAiMentionCandidate("foo@a"), null);
  // @の後に空白や日本語が続く(トークン終了)
  assert.equal(findChatAiMentionCandidate("@A "), null);
  assert.equal(findChatAiMentionCandidate("メンションなし"), null);
  assert.equal(findChatAiMentionCandidate(""), null);
});

test("hasChatAiMention: @AIメンションを判定する", () => {
  assert.equal(hasChatAiMention("@AI これを教えてください"), true);
  assert.equal(hasChatAiMention("これはどうですか? @ai"), true);
  assert.equal(hasChatAiMention("@AIに聞いてみます"), true);
  assert.equal(hasChatAiMention("メンションなし"), false);
  // 単語の一部やメールアドレスには反応しない
  assert.equal(hasChatAiMention("@aircraft の話"), false);
  assert.equal(hasChatAiMention("foo@ai.example.com 宛に送信"), false);
});

test("validateChatMessageBody: スタンプはプリセット絵文字のみ・添付不可", () => {
  assert.equal(
    validateChatMessageBody({ kind: "stamp", body: "🎉", hasAttachment: false }),
    "🎉",
  );
  assert.throws(() =>
    validateChatMessageBody({ kind: "stamp", body: "🦄", hasAttachment: false }),
  );
  assert.throws(() =>
    validateChatMessageBody({ kind: "stamp", body: "👍", hasAttachment: true }),
  );
});

test("validateChatMessageBody: 画像スタンプはプリセットIDのみ・添付不可", () => {
  assert.equal(
    validateChatMessageBody({ kind: "sticker", body: "naruhodo", hasAttachment: false }),
    "naruhodo",
  );
  assert.throws(() =>
    validateChatMessageBody({ kind: "sticker", body: "unknown-id", hasAttachment: false }),
  );
  assert.throws(() =>
    validateChatMessageBody({ kind: "sticker", body: "naruhodo", hasAttachment: true }),
  );
});

test("isChatStickerId / chatStickerLabel: プリセットの判定とラベル取得", () => {
  assert.equal(isChatStickerId("kansha"), true);
  assert.equal(isChatStickerId("../etc/passwd"), false);
  assert.equal(chatStickerLabel("kansha"), "感謝");
  assert.equal(chatStickerLabel("unknown"), "スタンプ");
});
