import { createError, readMultipartFormData, setResponseStatus } from "h3";
import type { ChatMessageKind } from "~~/types/portal";
import { getDb } from "~~/server/utils/survey";
import {
  createChatMessage,
  getChatMessageRow,
  getChatSchedule,
  parseChatId,
  validateChatMessageBody,
} from "~~/server/utils/chat";
import {
  getResourceObjectPrefix,
  getResourcesBucket,
  normalizeResourceMimeType,
  sanitizeFileName,
  validateResourceFile,
} from "~~/server/utils/resources";
import { getChatJstToday, isChatReadOnly } from "~~/utils/chat";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
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

  const parts = await readMultipartFormData(event);
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: "multipart/form-data is required." });
  }

  const getTextField = (name: string) =>
    parts.find((item) => item.name === name && !item.filename)?.data.toString("utf8") ?? "";

  const rawKind = getTextField("kind").trim() || "text";
  if (rawKind !== "text" && rawKind !== "stamp") {
    throw createError({ statusCode: 400, statusMessage: "kind is invalid." });
  }
  const kind = rawKind as ChatMessageKind;

  const filePart = parts.find(
    (item) => item.name === "file" && item.filename && item.data.byteLength > 0,
  );

  const body = validateChatMessageBody({
    kind,
    body: getTextField("body"),
    hasAttachment: Boolean(filePart),
  });

  const rawReplyTo = getTextField("replyToId").trim();
  let replyToId: number | null = null;
  if (rawReplyTo) {
    replyToId = parseChatId(rawReplyTo, "replyToId is invalid.");
    const target = await getChatMessageRow(db, replyToId);
    if (!target || target.schedule_id !== scheduleId) {
      throw createError({ statusCode: 400, statusMessage: "reply target not found." });
    }
  }

  let attachment: Parameters<typeof createChatMessage>[1]["attachment"] = null;

  if (filePart) {
    const fileName = sanitizeFileName(filePart.filename);
    const mimeType = normalizeResourceMimeType(fileName, filePart.type);

    validateResourceFile(
      { fileName, size: filePart.data.byteLength, mimeType: filePart.type },
      { allowZip: user.isAdmin === true },
    );

    const date = new Date().toISOString().slice(0, 10);
    const fileKey = `${getResourceObjectPrefix(event)}/chat/${date}/${crypto.randomUUID()}-${fileName}`;

    // multipart解析後のBufferはbyteOffset付きビューのことがあり、そのままではminiflareのR2 putが失敗する
    await getResourcesBucket(event).put(fileKey, new Uint8Array(filePart.data), {
      httpMetadata: { contentType: mimeType },
    });

    attachment = {
      fileKey,
      fileName,
      fileSize: filePart.data.byteLength,
      mimeType,
    };
  }

  await createChatMessage(db, {
    scheduleId,
    userEmail: user.email,
    kind,
    body,
    replyToId,
    attachment,
  });

  setResponseStatus(event, 201);
  return { ok: true };
});
