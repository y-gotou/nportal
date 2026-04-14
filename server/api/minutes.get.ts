import { getDb } from "~~/server/utils/survey";
import { listMinutes } from "~~/server/utils/minutes";

export default defineEventHandler(async (event) => {
  const db = getDb(event);
  const minutes = await listMinutes(db);
  return { minutes };
});
