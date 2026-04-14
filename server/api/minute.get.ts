import { getQuery } from "h3";
import { getDb } from "~~/server/utils/survey";
import { getMinutesDetail } from "~~/server/utils/minutes";

export default defineEventHandler(async (event) => {
  const slug = String(getQuery(event).slug ?? "");
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "slug query parameter is required" });
  }

  const db = getDb(event);
  const minutes = await getMinutesDetail(db, slug);
  if (!minutes) {
    throw createError({ statusCode: 404, statusMessage: "Minutes not found" });
  }

  return { minutes };
});
