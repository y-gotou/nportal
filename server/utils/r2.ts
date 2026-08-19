import { createError, type H3Event } from "h3";
import { getCloudflareEnv } from "./cloudflare.ts";
import {
  buildResourceContentDisposition,
  normalizeResourceMimeType,
  sanitizeFileName,
} from "./upload.ts";

export interface R2ObjectLike {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
    contentDisposition?: string;
  };
  writeHttpMetadata?: (headers: Headers) => void;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string | null,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentDisposition?: string;
      };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}

export function getResourceObjectPrefix(event: H3Event): string {
  const raw = getCloudflareEnv(event).RESOURCE_OBJECT_PREFIX;
  const prefix = typeof raw === "string" ? raw.trim() : "";
  return prefix || "local";
}

export function createResourceObjectKey(event: H3Event, fileName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${getResourceObjectPrefix(event)}/resources/${date}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

// R2 オブジェクトをストリーミングで返す。見つからなければ 404 を送出する。
export async function streamR2Object(
  event: H3Event,
  fileKey: string,
  options: {
    fileName: string | null;
    mimeType: string | null;
    notFoundMessage: string;
    // Markdown の Content-Type 補正(normalizeResourceMimeType)を適用するか
    normalizeMimeType?: boolean;
    // R2 メタデータを Content-Type のフォールバックに使うか(chat 添付は使わない従来挙動)
    useObjectMetadata?: boolean;
  },
): Promise<Response> {
  const object = await getResourcesBucket(event).get(fileKey);
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: options.notFoundMessage });
  }

  const headers = new Headers();
  if (options.useObjectMetadata !== false) {
    object.writeHttpMetadata?.(headers);
  }

  const fallback = options.mimeType || headers.get("Content-Type") || "application/octet-stream";
  headers.set(
    "Content-Type",
    options.normalizeMimeType === false
      ? fallback
      : normalizeResourceMimeType(options.fileName ?? "resource", fallback),
  );
  headers.set("Content-Disposition", buildResourceContentDisposition(options.fileName));
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(object.body, { headers });
}

export function getResourcesBucket(event: H3Event): R2BucketLike {
  const bucket = getCloudflareEnv<{ RESOURCES_BUCKET: R2BucketLike }>(event).RESOURCES_BUCKET;

  if (!bucket) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cloudflare R2 binding `RESOURCES_BUCKET` is not configured.",
    });
  }

  return bucket;
}
