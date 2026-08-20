import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import {
  getChatMessageRow,
  getChatSchedule,
  parseChatId,
  toggleChatReaction,
} from "~~/server/utils/chat";
import { getChatJstToday, isChatEmoji, isChatReadOnly } from "#shared/utils/chat";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const db = getDb(event);
  const messageId = parseChatId(event.context.params?.id, "messageId is invalid.");

  const body = await readBody<{ emoji?: unknown }>(event);
  const emoji = typeof body?.emoji === "string" ? body.emoji : "";
  if (!isChatEmoji(emoji)) {
    throw createError({ statusCode: 400, statusMessage: "emoji is not allowed." });
  }

  const message = await getChatMessageRow(db, messageId);
  if (!message || message.deleted_at) {
    throw createError({ statusCode: 404, statusMessage: "Message not found." });
  }

  const schedule = await getChatSchedule(db, message.schedule_id);
  if (!schedule || isChatReadOnly(schedule.date, getChatJstToday())) {
    throw createError({ statusCode: 403, statusMessage: "This chat room is read-only." });
  }

  const status = await toggleChatReaction(db, message, user.email, emoji);

  return { status };
});
