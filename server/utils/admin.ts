import { createError, type H3Event } from "h3";

export function getAdminEmails(event: H3Event): string[] {
  const env = (
    event.context.cloudflare as { env?: Record<string, string | undefined> } | undefined
  )?.env;
  const raw = env?.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function assertAdmin(event: H3Event): void {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const admins = getAdminEmails(event);
  if (!admins.includes(user.email)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
}
