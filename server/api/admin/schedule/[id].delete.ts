import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { assertAdmin } from "~~/server/utils/admin";
import { deleteScheduleItem } from "~~/server/utils/schedule";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid id");

  const db = getDb(event);
  await deleteScheduleItem(db, id);
  return { success: true };
});
