import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  getChatMessageRow,
  getChatSchedule,
  parseChatId,
  toggleChatReaction,
} from "~~/server/utils/chat";
import { getChatJstToday, isChatEmoji, isChatReadOnly } from "~~/utils/chat";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

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
