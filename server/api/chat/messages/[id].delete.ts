import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  getChatMessageRow,
  getChatSchedule,
  parseChatId,
  softDeleteChatMessage,
} from "~~/server/utils/chat";
import { getResourcesBucket } from "~~/server/utils/resources";
import { getChatJstToday, isChatReadOnly } from "~~/utils/chat";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const db = getDb(event);
  const messageId = parseChatId(event.context.params?.id, "messageId is invalid.");

  const message = await getChatMessageRow(db, messageId);
  if (!message || message.deleted_at) {
    throw createError({ statusCode: 404, statusMessage: "Message not found." });
  }

  if (user.isAdmin !== true) {
    if (message.user_email !== user.email) {
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    }

    const schedule = await getChatSchedule(db, message.schedule_id);
    if (!schedule || isChatReadOnly(schedule.date, getChatJstToday())) {
      throw createError({ statusCode: 403, statusMessage: "This chat room is read-only." });
    }
  }

  await softDeleteChatMessage(db, message);

  if (message.file_key) {
    try {
      await getResourcesBucket(event).delete(message.file_key);
    } catch (error) {
      // R2の削除失敗は投稿の削除自体を妨げない
      console.error("Failed to delete chat attachment from R2:", error);
    }
  }

  return { ok: true };
});
