import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { assertAdmin } from "~~/server/utils/admin";
import {
  createScheduleItem,
  parseSchedulePayload,
  type SchedulePayload,
} from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const payload = parseSchedulePayload(await readBody<Partial<SchedulePayload>>(event));

  const db = getDb(event);
  const item = await createScheduleItem(db, payload);
  return { schedule: item };
});
