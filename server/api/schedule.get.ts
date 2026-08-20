import { getDb } from "~~/server/utils/db";
import { listSchedule } from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  const db = getDb(event);
  const schedule = await listSchedule(db);
  return { schedule };
});
