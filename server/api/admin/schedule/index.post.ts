import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { createScheduleItem, type SchedulePayload } from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const body = await readBody<Partial<SchedulePayload>>(event);

  if (!body.date || !body.time || !body.title || !body.presenter) {
    throw createError({ statusCode: 400, statusMessage: "date, time, title, presenter are required" });
  }

  const payload: SchedulePayload = {
    date: body.date,
    time: body.time,
    title: body.title,
    meetingUrl: body.meetingUrl ?? null,
    minutesSlug: body.minutesSlug ?? null,
    topics: Array.isArray(body.topics) ? body.topics : [],
    presenter: body.presenter,
    location: body.location ?? null,
  };

  const db = getDb(event);
  const item = await createScheduleItem(db, payload);
  return { schedule: item };
});
