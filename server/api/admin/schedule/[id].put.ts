import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { assertAdmin } from "~~/server/utils/admin";
import {
  parseSchedulePayload,
  updateScheduleItem,
  type SchedulePayload,
} from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid id");
  const payload = parseSchedulePayload(await readBody<Partial<SchedulePayload>>(event));

  const db = getDb(event);
  const item = await updateScheduleItem(db, id, payload);
  return { schedule: item };
});
