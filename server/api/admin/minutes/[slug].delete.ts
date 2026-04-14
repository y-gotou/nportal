import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { deleteMinutes } from "~~/server/utils/minutes";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const slug = String(event.context.params?.slug ?? "");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug is required" });

  const db = getDb(event);
  await deleteMinutes(db, slug);
  return { success: true };
});
