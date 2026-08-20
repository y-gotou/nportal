import { createError } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { getChatMessageRow, parseChatId } from "~~/server/utils/chat";
import { streamR2Object } from "~~/server/utils/r2";

export default defineEventHandler(async (event) => {
  requireUser(event);

  const db = getDb(event);
  const messageId = parseChatId(event.context.params?.id, "messageId is invalid.");

  const message = await getChatMessageRow(db, messageId);
  if (!message || message.deleted_at || !message.file_key) {
    throw createError({ statusCode: 404, statusMessage: "Chat file not found." });
  }

  return await streamR2Object(event, message.file_key, {
    fileName: message.file_name,
    mimeType: message.mime_type,
    notFoundMessage: "Chat file not found.",
    useObjectMetadata: false,
  });
});
