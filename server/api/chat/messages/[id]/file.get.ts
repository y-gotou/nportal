import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import { getChatMessageRow, parseChatId } from "~~/server/utils/chat";
import {
  buildResourceContentDisposition,
  getResourcesBucket,
  normalizeResourceMimeType,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const db = getDb(event);
  const messageId = parseChatId(event.context.params?.id, "messageId is invalid.");

  const message = await getChatMessageRow(db, messageId);
  if (!message || message.deleted_at || !message.file_key) {
    throw createError({ statusCode: 404, statusMessage: "Chat file not found." });
  }

  const object = await getResourcesBucket(event).get(message.file_key);
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: "Chat file not found." });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    normalizeResourceMimeType(
      message.file_name ?? "file",
      message.mime_type || "application/octet-stream",
    ),
  );
  headers.set("Content-Disposition", buildResourceContentDisposition(message.file_name));
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(object.body, { headers });
});
