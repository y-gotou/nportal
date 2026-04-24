import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { updateMinutes } from "~~/server/utils/minutes";
import type { MinutesPayload } from "~~/types/portal";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const slug = String(event.context.params?.slug ?? "");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug is required" });

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
  const minutes = await updateMinutes(db, slug, payload);
  return { minutes };
});
