import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { createMinutes, type MinutesPayload } from "~~/server/utils/minutes";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const body = await readBody<Partial<MinutesPayload>>(event);

  if (!body.slug || !body.title || !body.date) {
    throw createError({ statusCode: 400, statusMessage: "slug, title, date are required" });
  }

  const payload: MinutesPayload = {
    slug: body.slug,
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
