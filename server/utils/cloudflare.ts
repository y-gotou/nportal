import type { H3Event } from "h3";

// Cloudflare Pages の bindings(event.context.cloudflare.env)を取り出す。
export function getCloudflareEnv<T = Record<string, unknown>>(event: H3Event): Partial<T> {
  return (event.context.cloudflare as { env?: Partial<T> } | undefined)?.env ?? {};
}
