import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { assertAdmin } from "~~/server/utils/admin";
import { createMinutes, parseMinutesPayload } from "~~/server/utils/minutes";
import type { MinutesPayload } from "~~/types/portal";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const payload = parseMinutesPayload(await readBody<Partial<MinutesPayload>>(event));

  const db = getDb(event);
  const minutes = await createMinutes(db, payload);
  return { minutes };
});
