import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { createMinutes } from "~~/server/utils/minutes";
import type { MinutesPayload } from "~~/types/portal";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const body = await readBody<Partial<MinutesPayload>>(event);

  if (!body.title || !body.date) {
    throw createError({ statusCode: 400, statusMessage: "title, date are required" });
  }

  const payload: MinutesPayload = {
    title: body.title,
    date: body.date,
    attendees: Array.isArray(body.attendees) ? body.attendees : [],
    topics: Array.isArray(body.topics) ? body.topics : [],
    contentMd: body.contentMd ?? "",
  };

  const db = getDb(event);
  const minutes = await createMinutes(db, payload);
  return { minutes };
});
