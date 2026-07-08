import { createError } from "h3";
import type { H3Event } from "h3";

interface LlmEnv {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

function getLlmEnv(event: H3Event): LlmEnv {
  const env = (
    event.context.cloudflare as
      | { env?: Record<string, string | undefined> }
      | undefined
  )?.env;

  const baseUrl = env?.LLM_API_BASE_URL;
  const clientId = env?.LLM_CF_ACCESS_CLIENT_ID;
  const clientSecret = env?.LLM_CF_ACCESS_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: "LLM API is not configured.",
    });
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), clientId, clientSecret };
}

// 社内 LLM (OpenAI 互換 API) へ Cloudflare Access サービストークン付きで転送する
export async function llmFetch(
  event: H3Event,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { baseUrl, clientId, clientSecret } = getLlmEnv(event);

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
    },
  });
}

// 上流レスポンスをそのまま返す（stream: true の SSE もパススルーされる）
export function passthroughResponse(upstream: Response): Response {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
