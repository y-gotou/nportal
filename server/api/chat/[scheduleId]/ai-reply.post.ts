import { createError, readBody, setResponseStatus } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  getChatMessageRow,
  getChatSchedule,
  hasChatAiReplyTo,
  parseChatId,
} from "~~/server/utils/chat";
import { postChatAiReply } from "~~/server/utils/chat-ai";
import { CHAT_AI_EMAIL, getChatJstToday, hasChatAiMention, isChatReadOnly } from "~~/utils/chat";

// @AI メンション付き投稿への返信を生成する。投稿したクライアントが呼び出し、
// リクエスト中に同期実行する(LLM 生成は数分かかることがあるが I/O 待ちが主体)。
// 返信自体は chat_messages に挿入されるため、表示は通常のポーリングで反映される。
export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const db = getDb(event);
  const scheduleId = parseChatId(event.context.params?.scheduleId, "scheduleId is invalid.");

  const schedule = await getChatSchedule(db, scheduleId);
  if (!schedule) {
    throw createError({ statusCode: 404, statusMessage: "Schedule not found." });
  }
  if (isChatReadOnly(schedule.date, getChatJstToday())) {
    throw createError({ statusCode: 403, statusMessage: "This chat room is read-only." });
  }

  const body = await readBody<{ messageId?: unknown }>(event);
  const messageId = parseChatId(body?.messageId, "messageId is invalid.");

  const target = await getChatMessageRow(db, messageId);
  if (!target || target.schedule_id !== scheduleId || target.deleted_at !== null) {
    throw createError({ statusCode: 404, statusMessage: "Message not found." });
  }
  if (
    target.kind !== "text" ||
    target.user_email === CHAT_AI_EMAIL ||
    !hasChatAiMention(target.body)
  ) {
    throw createError({ statusCode: 400, statusMessage: "Message is not an @AI mention." });
  }

  // 既に返信済みなら再生成しない(リトライや二重呼び出し対策)
  if (await hasChatAiReplyTo(db, messageId, CHAT_AI_EMAIL)) {
    return { ok: true, duplicate: true };
  }

  await postChatAiReply(event, db, {
    scheduleId,
    schedule: { title: schedule.title, date: schedule.date },
    replyToId: messageId,
  });

  setResponseStatus(event, 201);
  return { ok: true };
});
