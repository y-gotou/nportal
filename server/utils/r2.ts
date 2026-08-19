import { createError, type H3Event } from "h3";
import { sanitizeFileName } from "./upload.ts";

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
  const env = (
    event.context.cloudflare as { env?: Record<string, unknown> } | undefined
  )?.env;

  const prefix = typeof env?.RESOURCE_OBJECT_PREFIX === "string"
    ? env.RESOURCE_OBJECT_PREFIX.trim()
    : "";

  return prefix || "local";
}

export function createResourceObjectKey(event: H3Event, fileName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${getResourceObjectPrefix(event)}/resources/${date}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function getResourcesBucket(event: H3Event): R2BucketLike {
  const bucket = (
    event.context.cloudflare as { env?: { RESOURCES_BUCKET?: R2BucketLike } } | undefined
  )?.env?.RESOURCES_BUCKET;

  if (!bucket) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cloudflare R2 binding `RESOURCES_BUCKET` is not configured.",
    });
  }

  return bucket;
}
