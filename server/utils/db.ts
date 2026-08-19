import { createError, type H3Event } from "h3";
import type { D1DatabaseLike } from "../../types/portal.ts";

export function getDb(event: H3Event): D1DatabaseLike {
  const db = (
    event.context.cloudflare as { env?: { DB?: D1DatabaseLike } } | undefined
  )?.env?.DB;

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cloudflare D1 binding `DB` is not configured.",
    });
  }

  return db;
}
