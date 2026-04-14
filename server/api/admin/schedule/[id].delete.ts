import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { deleteScheduleItem } from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = Number(event.context.params?.id);
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid id" });

  const db = getDb(event);
  await deleteScheduleItem(db, id);
  return { success: true };
});
