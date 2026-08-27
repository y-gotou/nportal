import { getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { listMinutes } from "~~/server/utils/minutes";

export default defineEventHandler(async (event) => {
  const q = getQuery(event).q;
  const keyword = typeof q === "string" ? q : undefined;

  const db = getDb(event);
  const minutes = await listMinutes(db, keyword);
  return { minutes };
});
