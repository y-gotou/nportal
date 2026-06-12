import { createError } from "h3";
import type {
  ChatMessage,
  ChatMessageKind,
  ChatReaction,
  D1DatabaseLike,
} from "../../types/portal.ts";
import {
  MAX_CHAT_BODY_LENGTH,
  isChatEmoji,
  isChatImageMimeType,
  isChatStickerId,
} from "../../utils/chat.ts";

export interface ChatMessageRow {
  id: number;
  schedule_id: number;
  user_email: string;
  kind: string;
  body: string;
  reply_to_id: number | null;
  file_key: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ChatScheduleRow {
  id: number;
  title: string;
  date: string;
  time: string;
}

export function parseChatId(value: unknown, message: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: message });
  }

  return id;
}

export function toChatMessage(row: ChatMessageRow): ChatMessage {
  const deleted = row.deleted_at !== null;

  return {
    id: row.id,
    scheduleId: row.schedule_id,
    userEmail: row.user_email,
    kind: row.kind === "stamp" ? "stamp" : row.kind === "sticker" ? "sticker" : "text",
    body: deleted ? "" : row.body,
    replyToId: row.reply_to_id,
    attachment: !deleted && row.file_key
      ? {
          fileName: row.file_name ?? "file",
          fileSize: row.file_size ?? 0,
          mimeType: row.mime_type ?? "application/octet-stream",
          isImage: isChatImageMimeType(row.mime_type),
        }
      : null,
    deleted,
    createdAt: row.created_at,
  };
}

export function validateChatMessageBody(input: {
  kind: ChatMessageKind;
  body: string;
  hasAttachment: boolean;
}): string {
  if (input.kind === "stamp") {
    if (input.hasAttachment) {
      throw createError({ statusCode: 400, statusMessage: "stamp message cannot have an attachment." });
    }
    if (!isChatEmoji(input.body)) {
      throw createError({ statusCode: 400, statusMessage: "stamp emoji is not allowed." });
    }
    return input.body;
  }

  if (input.kind === "sticker") {
    if (input.hasAttachment) {
      throw createError({ statusCode: 400, statusMessage: "sticker message cannot have an attachment." });
    }
    if (!isChatStickerId(input.body)) {
      throw createError({ statusCode: 400, statusMessage: "sticker is not allowed." });
    }
    return input.body;
  }

  const body = input.body.trim();

  if (!body && !input.hasAttachment) {
    throw createError({ statusCode: 400, statusMessage: "message body is required." });
  }
  if (body.length > MAX_CHAT_BODY_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `message body exceeds ${MAX_CHAT_BODY_LENGTH} characters.`,
    });
  }

  return body;
}

export async function getChatSchedule(
  db: D1DatabaseLike,
  scheduleId: number,
): Promise<ChatScheduleRow | null> {
  return await db
    .prepare("SELECT id, title, date, time FROM schedule WHERE id = ?")
    .bind(scheduleId)
    .first<ChatScheduleRow>();
}

export async function getChatRoomVersion(
  db: D1DatabaseLike,
  scheduleId: number,
): Promise<number> {
  const row = await db
    .prepare("SELECT version FROM chat_room_state WHERE schedule_id = ?")
    .bind(scheduleId)
    .first<{ version: number }>();

  return row?.version ?? 0;
}

function bumpChatRoomVersionStatement(db: D1DatabaseLike, scheduleId: number) {
  return db
    .prepare(
      "INSERT INTO chat_room_state (schedule_id, version) VALUES (?, 1) " +
        "ON CONFLICT(schedule_id) DO UPDATE SET version = version + 1, updated_at = datetime('now')",
    )
    .bind(scheduleId);
}

export async function listChatMessages(
  db: D1DatabaseLike,
  scheduleId: number,
  afterId = 0,
): Promise<ChatMessage[]> {
  const { results } = await db
    .prepare(
      "SELECT id, schedule_id, user_email, kind, body, reply_to_id, file_key, file_name, file_size, mime_type, deleted_at, created_at " +
        "FROM chat_messages WHERE schedule_id = ? AND id > ? ORDER BY id",
    )
    .bind(scheduleId, afterId)
    .all<ChatMessageRow>();

  return results.map(toChatMessage);
}

export async function listChatReactions(
  db: D1DatabaseLike,
  scheduleId: number,
): Promise<ChatReaction[]> {
  const { results } = await db
    .prepare(
      "SELECT r.message_id, r.emoji, r.user_email FROM chat_reactions r " +
        "JOIN chat_messages m ON m.id = r.message_id WHERE m.schedule_id = ? ORDER BY r.id",
    )
    .bind(scheduleId)
    .all<{ message_id: number; emoji: string; user_email: string }>();

  const grouped = new Map<string, ChatReaction>();

  for (const row of results) {
    const key = `${row.message_id}:${row.emoji}`;
    const reaction = grouped.get(key);
    if (reaction) {
      reaction.userEmails.push(row.user_email);
    } else {
      grouped.set(key, {
        messageId: row.message_id,
        emoji: row.emoji,
        userEmails: [row.user_email],
      });
    }
  }

  return [...grouped.values()];
}

export async function listDeletedChatMessageIds(
  db: D1DatabaseLike,
  scheduleId: number,
): Promise<number[]> {
  const { results } = await db
    .prepare("SELECT id FROM chat_messages WHERE schedule_id = ? AND deleted_at IS NOT NULL ORDER BY id")
    .bind(scheduleId)
    .all<{ id: number }>();

  return results.map((row) => row.id);
}

export async function getChatMessageRow(
  db: D1DatabaseLike,
  messageId: number,
): Promise<ChatMessageRow | null> {
  return await db
    .prepare(
      "SELECT id, schedule_id, user_email, kind, body, reply_to_id, file_key, file_name, file_size, mime_type, deleted_at, created_at " +
        "FROM chat_messages WHERE id = ?",
    )
    .bind(messageId)
    .first<ChatMessageRow>();
}

export interface CreateChatMessagePayload {
  scheduleId: number;
  userEmail: string;
  kind: ChatMessageKind;
  body: string;
  replyToId: number | null;
  attachment?: {
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null;
}

export async function createChatMessage(
  db: D1DatabaseLike,
  payload: CreateChatMessagePayload,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        "INSERT INTO chat_messages (schedule_id, user_email, kind, body, reply_to_id, file_key, file_name, file_size, mime_type) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        payload.scheduleId,
        payload.userEmail,
        payload.kind,
        payload.body,
        payload.replyToId,
        payload.attachment?.fileKey ?? null,
        payload.attachment?.fileName ?? null,
        payload.attachment?.fileSize ?? null,
        payload.attachment?.mimeType ?? null,
      ),
    bumpChatRoomVersionStatement(db, payload.scheduleId),
  ]);
}

export async function softDeleteChatMessage(
  db: D1DatabaseLike,
  message: ChatMessageRow,
): Promise<void> {
  await db.batch([
    db
      .prepare("UPDATE chat_messages SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
      .bind(message.id),
    bumpChatRoomVersionStatement(db, message.schedule_id),
  ]);
}

export async function toggleChatReaction(
  db: D1DatabaseLike,
  message: ChatMessageRow,
  userEmail: string,
  emoji: string,
): Promise<"added" | "removed"> {
  const existing = await db
    .prepare("SELECT id FROM chat_reactions WHERE message_id = ? AND user_email = ? AND emoji = ?")
    .bind(message.id, userEmail, emoji)
    .first<{ id: number }>();

  const mutation = existing
    ? db.prepare("DELETE FROM chat_reactions WHERE id = ?").bind(existing.id)
    : db
        .prepare("INSERT INTO chat_reactions (message_id, user_email, emoji) VALUES (?, ?, ?)")
        .bind(message.id, userEmail, emoji);

  await db.batch([mutation, bumpChatRoomVersionStatement(db, message.schedule_id)]);

  return existing ? "removed" : "added";
}
