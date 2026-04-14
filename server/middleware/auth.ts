import { createError, getHeader } from "h3";

interface JwtPayload {
  email?: string;
  sub?: string;
  exp?: number;
  aud?: string | string[];
}

function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) return {};
  try {
    const payload = parts[1] ?? "";
    // Base64URL → Base64 → JSON
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return {};
  }
}

function validateJwtPayload(payload: JwtPayload, expectedAud?: string): boolean {
  // 有効期限チェック
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  // AUD クレームチェック（設定されている場合のみ）
  if (expectedAud && payload.aud) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(expectedAud)) {
      return false;
    }
  }
  return true;
}

export default defineEventHandler((event) => {
  const path = event.path ?? "";

  const env = (
    event.context.cloudflare as
      | { env?: Record<string, string | undefined> }
      | undefined
  )?.env;

  // 全ルートでJWTからユーザー情報を取得（ヘッダー表示などに利用）
  const token = getHeader(event, "Cf-Access-Jwt-Assertion");
  if (token) {
    const payload = decodeJwtPayload(token);
    const expectedAud = env?.CF_ACCESS_AUD;
    if (payload.email && validateJwtPayload(payload, expectedAud)) {
      event.context.user = { email: payload.email };
    }
  }

  // ローカル開発用: MOCK_USER_EMAIL 環境変数からモックユーザーを設定
  if (!event.context.user) {
    const mockEmail = env?.MOCK_USER_EMAIL;
    if (mockEmail) {
      event.context.user = { email: mockEmail };
    }
  }

  // APIルートと動的ページは認証必須
  if (path.startsWith("/api/") || path.startsWith("/survey") || path.startsWith("/admin")) {
    if (!event.context.user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized. Please log in via Cloudflare Access.",
      });
    }
  }
});
