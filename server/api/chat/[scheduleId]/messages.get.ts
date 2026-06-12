import { getQuery, setResponseStatus } from "h3";
import type { ChatMessagesResponse } from "~~/types/portal";
import { getDb } from "~~/server/utils/survey";
import {
  getChatRoomVersion,
  getChatSchedule,
  listChatMessages,
  listChatReactions,
  listDeletedChatMessageIds,
  parseChatId,
} from "~~/server/utils/chat";
import { getChatJstToday, isChatReadOnly } from "~~/utils/chat";

export default defineEventHandler(async (event) => {
  const db = getDb(event);
  const scheduleId = parseChatId(event.context.params?.scheduleId, "scheduleId is invalid.");
  const query = getQuery(event);

  const version = await getChatRoomVersion(db, scheduleId);

  // バージョンが一致していれば変更なし。ボディなしの204を即返す(弱いネットワーク対策)
  const clientVersion = typeof query.version === "string" ? Number(query.version) : null;
  if (clientVersion !== null && Number.isInteger(clientVersion) && clientVersion === version) {
    setResponseStatus(event, 204);
    return null;
  }

  const schedule = await getChatSchedule(db, scheduleId);
  if (!schedule) {
    throw createError({ statusCode: 404, statusMessage: "Schedule not found." });
  }

  const after = typeof query.after === "string" ? Number(query.after) : 0;
  const afterId = Number.isInteger(after) && after > 0 ? after : 0;

  const [messages, reactions, deletedMessageIds] = await Promise.all([
    listChatMessages(db, scheduleId, afterId),
    listChatReactions(db, scheduleId),
    listDeletedChatMessageIds(db, scheduleId),
  ]);

  const response: ChatMessagesResponse = {
    version,
    room: {
      scheduleId: schedule.id,
      title: schedule.title,
      date: schedule.date,
      time: schedule.time,
      readOnly: isChatReadOnly(schedule.date, getChatJstToday()),
    },
    messages,
    reactions,
    deletedMessageIds,
  };

  return response;
});
