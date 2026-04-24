import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { updateScheduleItem, type SchedulePayload } from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = Number(event.context.params?.id);
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid id" });

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
  const item = await updateScheduleItem(db, id, payload);
  return { schedule: item };
});
