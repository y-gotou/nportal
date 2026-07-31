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

// クラウドタスクから呼ばれる連携API（ユーザー認証ではなくトークン認証）
const NEWS_MACHINE_PATHS = ["/api/news/ingest", "/api/news/feedback-summary"];

// 比較時間を入力に依存させない
function isValidIngestToken(header: string | undefined, expected: string | undefined) {
  if (!expected) return false;

  const presented = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (presented.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return diff === 0;
}

export default defineEventHandler((event) => {
  const path = event.path ?? "";

  const env = (
    event.context.cloudflare as
      | { env?: Record<string, string | undefined> }
      | undefined
  )?.env;

  const adminEmails = (env?.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // 全ルートでJWTからユーザー情報を取得（ヘッダー表示などに利用）
  const token = getHeader(event, "Cf-Access-Jwt-Assertion");
  if (token) {
    const payload = decodeJwtPayload(token);
    const expectedAud = env?.CF_ACCESS_AUD;
    if (payload.email && validateJwtPayload(payload, expectedAud)) {
      event.context.user = { email: payload.email, isAdmin: adminEmails.includes(payload.email) };
    }
  }

  // ローカル開発用: MOCK_USER_EMAIL 環境変数からモックユーザーを設定
  if (!event.context.user) {
    const mockEmail = env?.MOCK_USER_EMAIL;
    if (mockEmail) {
      event.context.user = { email: mockEmail, isAdmin: adminEmails.includes(mockEmail) };
    }
  }

  // ニュース連携APIはサービストークンで呼ばれ、Access JWT に email クレームがない。
  // 代わりに Bearer トークンで認証する。
  if (NEWS_MACHINE_PATHS.includes(path.split("?")[0] ?? "")) {
    if (!isValidIngestToken(getHeader(event, "authorization"), env?.NEWS_INGEST_TOKEN)) {
      throw createError({ statusCode: 401, statusMessage: "Invalid ingest token." });
    }
    return;
  }

  // APIルートと動的ページは認証必須
  if (path.startsWith("/api/") || path.startsWith("/survey") || path.startsWith("/reports") || path.startsWith("/resources") || path.startsWith("/admin") || path.startsWith("/chat") || path.startsWith("/news")) {
    if (!event.context.user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized. Please log in via Cloudflare Access.",
      });
    }
  }
});
