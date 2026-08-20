import { createError, type H3Event } from "h3";
import type { D1DatabaseLike } from "../../types/portal.ts";
import { getCloudflareEnv } from "./cloudflare.ts";

export function getDb(event: H3Event): D1DatabaseLike {
  const db = getCloudflareEnv<{ DB: D1DatabaseLike }>(event).DB;

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cloudflare D1 binding `DB` is not configured.",
    });
  }

  return db;
}
