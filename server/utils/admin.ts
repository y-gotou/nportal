import { createError, type H3Event } from "h3";
import { requireUser } from "./auth.ts";
import { getCloudflareEnv } from "./cloudflare.ts";

function getAdminEmails(event: H3Event): string[] {
  const raw = getCloudflareEnv<{ ADMIN_EMAILS: string }>(event).ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function assertAdmin(event: H3Event): void {
  const user = requireUser(event);
  const admins = getAdminEmails(event);
  if (!admins.includes(user.email)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
}
