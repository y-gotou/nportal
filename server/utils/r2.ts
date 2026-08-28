import { createError, type H3Event } from "h3";
import { getCloudflareEnv } from "./cloudflare.ts";
import {
  buildResourceContentDisposition,
  isHtmlFileName,
  normalizeResourceMimeType,
  sanitizeFileName,
} from "./upload.ts";
import { utcToday } from "../../shared/utils/date.ts";

export interface R2ObjectLike {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
    contentDisposition?: string;
  };
}

// multipart 解析後のデータは Node の Buffer で、miniflare のバインディングプロキシは
// 標準の TypedArray しか復元できない(Buffer のまま put するとローカル dev が 500 になる)。
// コピーを避けるため、同じメモリを指す Uint8Array のビューへ変換する。
export function toR2ObjectBody(data: Uint8Array): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
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
  const date = utcToday();
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
    // HTML を inline + CSP sandbox でページ表示させるか(資料共有のみ。chat 添付は従来どおりダウンロード)
    htmlInline?: boolean;
  },
): Promise<Response> {
  const object = await getResourcesBucket(event).get(fileKey);
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: options.notFoundMessage });
  }

  const headers = new Headers();
  // R2 の writeHttpMetadata は Headers を引数に取り、miniflare のプロキシが直列化できないため
  // 使わない(ローカル dev が 500 になる)。参照するのは Content-Type のフォールバックのみ。
  const objectContentType =
    options.useObjectMetadata !== false ? object.httpMetadata?.contentType : undefined;

  const fallback = options.mimeType || objectContentType || "application/octet-stream";
  headers.set(
    "Content-Type",
    options.normalizeMimeType === false
      ? fallback
      : normalizeResourceMimeType(options.fileName ?? "resource", fallback),
  );
  const htmlInline = options.htmlInline === true && isHtmlFileName(options.fileName);
  headers.set("Content-Disposition", buildResourceContentDisposition(options.fileName, { htmlInline }));
  if (htmlInline) {
    // 投稿 HTML を不透明オリジンで描画し、ポータル本体(Cookie・API)から隔離する
    headers.set("Content-Security-Policy", "sandbox allow-scripts");
  }
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
