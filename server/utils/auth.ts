import { createError, type H3Event } from "h3";
import type { CurrentUser } from "../../types/portal.ts";

// 認証ミドルウェア(server/middleware/auth.ts)が設定したユーザーを取り出す。
export function getUser(event: H3Event): CurrentUser | undefined {
  return event.context.user as CurrentUser | undefined;
}

// 未認証なら 401 を送出する。
export function requireUser(event: H3Event): CurrentUser {
  const user = getUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  return user;
}
