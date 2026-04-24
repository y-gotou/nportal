import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { createScheduleItem, type SchedulePayload } from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const body = await readBody<Partial<SchedulePayload>>(event);

  if (!body.date || !body.time || !body.title) {
    throw createError({ statusCode: 400, statusMessage: "date, time, title are required" });
  }

  const payload: SchedulePayload = {
    date: body.date,
    time: body.time,
    title: body.title,
    meetingUrl: body.meetingUrl ?? null,
    topics: Array.isArray(body.topics) ? body.topics : [],
    location: body.location ?? null,
  };

  const db = getDb(event);
  const item = await createScheduleItem(db, payload);
  return { schedule: item };
});
