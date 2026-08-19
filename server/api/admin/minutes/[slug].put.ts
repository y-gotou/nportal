import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { assertAdmin } from "~~/server/utils/admin";
import { parseMinutesPayload, updateMinutes } from "~~/server/utils/minutes";
import type { MinutesPayload } from "~~/types/portal";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const slug = String(event.context.params?.slug ?? "");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug is required" });

  const payload = parseMinutesPayload(await readBody<Partial<MinutesPayload>>(event));

  const db = getDb(event);
  const minutes = await updateMinutes(db, slug, payload);
  return { minutes };
});
