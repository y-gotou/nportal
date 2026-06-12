import { createError, type H3Event } from "h3";
import type { D1DatabaseLike, ResourceItem } from "../../types/portal.ts";

export const MAX_RESOURCE_FILE_SIZE = 50 * 1024 * 1024;

export type ResourceSourceType = "url" | "file";

interface ResourceRow {
  id: number;
  title: string;
  url: string;
  type: string;
  tags: string;
  date: string;
  presenter: string | null;
  related_minutes_slug: string | null;
  source_type: string | null;
  file_key: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  submitted_by: string | null;
}

export interface ResourceUser {
  email: string;
  isAdmin?: boolean;
}

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

const RESOURCE_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "PDF",
  ppt: "PowerPoint",
  pptx: "PowerPoint",
  doc: "Word",
  docx: "Word",
  xls: "Excel",
  xlsx: "Excel",
  csv: "CSV",
  txt: "Text",
  md: "Markdown",
  html: "HTML",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
  gif: "Image",
  webp: "Image",
  zip: "ZIP",
};

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ["application/pdf"],
  ppt: ["application/vnd.ms-powerpoint", "application/octet-stream"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/octet-stream"],
  doc: ["application/msword", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain", "application/octet-stream"],
  html: ["text/html", "application/octet-stream"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

function getBaseMimeType(value: string | null | undefined): string {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isMarkdownFileName(fileName: string | null | undefined): boolean {
  return getFileExtension(fileName ?? "") === "md";
}

export function isHtmlFileName(fileName: string | null | undefined): boolean {
  return getFileExtension(fileName ?? "") === "html";
}

export function normalizeResourceMimeType(fileName: string, mimeType?: string | null): string {
  if (isMarkdownFileName(fileName)) {
    return "text/markdown; charset=utf-8";
  }

  return mimeType?.trim() || "application/octet-stream";
}

export function getResourceFileUrl(resourceId: number, fileName?: string | null): string {
  return isMarkdownFileName(fileName)
    ? `/resources/${resourceId}`
    : `/api/resources/${resourceId}/file`;
}

function toResourceItem(row: ResourceRow, user?: ResourceUser): ResourceItem {
  const sourceType: ResourceSourceType = row.source_type === "file" ? "file" : "url";

  return {
    id: row.id,
    title: row.title,
    url: sourceType === "file" ? getResourceFileUrl(row.id, row.file_name) : row.url,
    type: row.type,
    tags: parseTags(row.tags),
    date: row.date,
    presenter: row.presenter,
    relatedMinutesSlug: row.related_minutes_slug,
    sourceType,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    submittedBy: row.submitted_by,
    canEdit: canEditResource(row, user),
  };
}

function parseTags(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function canEditResource(row: ResourceRow, user?: ResourceUser): boolean {
  if (!user) return false;
  return user.isAdmin === true || row.submitted_by === user.email;
}

export function parseResourceId(value: unknown): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: "Invalid resource ID." });
  }

  return id;
}

export function normalizeResourceTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

export function requireResourceTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw createError({ statusCode: 400, statusMessage: "title is required." });
  }

  return value.trim().slice(0, 200);
}

export function validateResourceUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw createError({ statusCode: 400, statusMessage: "url is required." });
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return url.toString();
  } catch {
    throw createError({ statusCode: 400, statusMessage: "url must be http or https." });
  }
}

export function sanitizeFileName(value: string | undefined): string {
  const name = (value ?? "resource")
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N} .()+,@_-]/gu, "_")
    .replace(/\s+/g, " ")
    .trim();

  return (name || "resource").slice(0, 180);
}

function encodeContentDispositionValue(value: string): string {
  return encodeURIComponent(value)
    .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildAsciiFileNameFallback(fileName: string): string {
  const fallback = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "")
    .replace(/[^\w .()+,@-]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return (fallback || "resource").slice(0, 180);
}

export function buildResourceContentDisposition(fileName: string | null | undefined): string {
  const safeName = sanitizeFileName(fileName ?? "resource");
  const dispositionType = isHtmlFileName(safeName) ? "attachment" : "inline";
  return `${dispositionType}; filename="${buildAsciiFileNameFallback(safeName)}"; filename*=UTF-8''${encodeContentDispositionValue(safeName)}`;
}

export function getFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
  return match?.[1] ?? "";
}

export function inferResourceType(input: { fileName?: string | null; url?: string | null }): string {
  if (input.fileName) {
    const extension = getFileExtension(input.fileName);
    return RESOURCE_TYPE_BY_EXTENSION[extension] ?? "File";
  }

  if (input.url) {
    return "URL";
  }

  return "File";
}

export function validateResourceFile(
  file: { fileName: string; size: number; mimeType?: string | null },
  options: { allowZip?: boolean } = {},
) {
  if (file.size < 1) {
    throw createError({ statusCode: 400, statusMessage: "file is empty." });
  }

  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    throw createError({ statusCode: 413, statusMessage: "file exceeds the 50MB limit." });
  }

  const extension = getFileExtension(file.fileName);
  const allowedMimes = MIME_TYPES_BY_EXTENSION[extension];

  if (!allowedMimes) {
    throw createError({ statusCode: 400, statusMessage: "file extension is not allowed." });
  }

  if (extension === "zip" && options.allowZip !== true) {
    throw createError({
      statusCode: 403,
      statusMessage: "zip files can only be submitted by administrators.",
    });
  }

  const mimeType = getBaseMimeType(file.mimeType);
  if (mimeType && !allowedMimes.includes(mimeType)) {
    throw createError({ statusCode: 400, statusMessage: "file type is not allowed." });
  }
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

export interface ListResourcesOptions {
  minutesSlug?: string;
  user?: ResourceUser;
}

export async function listResources(
  db: D1DatabaseLike,
  opts: ListResourcesOptions = {},
): Promise<ResourceItem[]> {
  let query = "SELECT * FROM resources";
  const bindings: unknown[] = [];

  if (opts.minutesSlug) {
    query += " WHERE related_minutes_slug = ?";
    bindings.push(opts.minutesSlug);
  }

  query += " ORDER BY date DESC, id DESC";

  const stmt = db.prepare(query);
  const { results } = await (bindings.length > 0 ? stmt.bind(...bindings) : stmt).all<ResourceRow>();
  return results.map((row) => toResourceItem(row, opts.user));
}

export async function getResourceRow(
  db: D1DatabaseLike,
  id: number,
): Promise<ResourceRow | null> {
  return await db
    .prepare("SELECT * FROM resources WHERE id = ?")
    .bind(id)
    .first<ResourceRow>();
}

export async function getResourceItem(
  db: D1DatabaseLike,
  id: number,
  user?: ResourceUser,
): Promise<ResourceItem | null> {
  const row = await getResourceRow(db, id);
  return row ? toResourceItem(row, user) : null;
}

export async function getEditableResourceRow(
  db: D1DatabaseLike,
  id: number,
  user: ResourceUser,
): Promise<ResourceRow> {
  const row = await getResourceRow(db, id);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Resource not found." });
  }

  if (!canEditResource(row, user)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  return row;
}

export interface ResourcePayload {
  title: string;
  url: string;
  type: string;
  tags: string[];
  date: string;
  presenter?: string | null;
  relatedMinutesSlug?: string | null;
  submittedBy?: string | null;
}

export interface ResourceMutationPayload {
  title: string;
  tags: string[];
  relatedMinutesSlug?: string | null;
  submittedBy: string;
  sourceType: ResourceSourceType;
  url?: string;
  fileKey?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export async function createResourceItem(
  db: D1DatabaseLike,
  payload: ResourcePayload,
): Promise<ResourceItem> {
  const result = await db
    .prepare(
      `INSERT INTO resources (title, url, type, tags, date, presenter, related_minutes_slug, source_type, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'url', ?)
       RETURNING id`,
    )
    .bind(
      payload.title,
      payload.url,
      payload.type,
      JSON.stringify(payload.tags),
      payload.date,
      payload.presenter ?? null,
      payload.relatedMinutesSlug ?? null,
      payload.submittedBy ?? null,
    )
    .first<{ id: number }>();

  if (!result) throw createError({ statusCode: 500, statusMessage: "Failed to create resource" });
  const created = await getResourceItem(db, result.id);
  if (!created) throw createError({ statusCode: 500, statusMessage: "Failed to create resource" });
  return created;
}

export async function createSubmittedResource(
  db: D1DatabaseLike,
  payload: ResourceMutationPayload,
): Promise<ResourceItem> {
  const date = new Date().toISOString().slice(0, 10);
  const url = payload.sourceType === "url" ? validateResourceUrl(payload.url) : "";
  const type = payload.sourceType === "url"
    ? inferResourceType({ url })
    : inferResourceType({ fileName: payload.fileName });

  const result = await db
    .prepare(
      `INSERT INTO resources
       (title, url, type, tags, date, presenter, related_minutes_slug, source_type, file_key, file_name, file_size, mime_type, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      payload.title,
      url,
      type,
      JSON.stringify(payload.tags),
      date,
      payload.submittedBy,
      payload.relatedMinutesSlug ?? null,
      payload.sourceType,
      payload.fileKey ?? null,
      payload.fileName ?? null,
      payload.fileSize ?? null,
      payload.mimeType ?? null,
      payload.submittedBy,
    )
    .first<{ id: number }>();

  if (!result) throw createError({ statusCode: 500, statusMessage: "Failed to create resource." });

  const created = await getResourceItem(db, result.id, {
    email: payload.submittedBy,
    isAdmin: false,
  });
  if (!created) throw createError({ statusCode: 500, statusMessage: "Failed to create resource." });
  return created;
}

export async function updateResourceItem(
  db: D1DatabaseLike,
  id: number,
  payload: ResourcePayload,
): Promise<ResourceItem> {
  await db
    .prepare(
      `UPDATE resources
       SET title = ?, url = ?, type = ?, tags = ?, date = ?, presenter = ?, related_minutes_slug = ?, source_type = 'url',
           file_key = NULL, file_name = NULL, file_size = NULL, mime_type = NULL, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      payload.title,
      payload.url,
      payload.type,
      JSON.stringify(payload.tags),
      payload.date,
      payload.presenter ?? null,
      payload.relatedMinutesSlug ?? null,
      id,
    )
    .first();

  const updated = await getResourceItem(db, id);
  if (!updated) throw createError({ statusCode: 404, statusMessage: "Resource not found" });
  return updated;
}

export async function updateSubmittedResource(
  db: D1DatabaseLike,
  id: number,
  payload: ResourceMutationPayload,
  user: ResourceUser,
): Promise<{ resource: ResourceItem; previousFileKey: string | null }> {
  const existing = await getEditableResourceRow(db, id, user);
  const url = payload.sourceType === "url" ? validateResourceUrl(payload.url) : "";
  const type = payload.sourceType === "url"
    ? inferResourceType({ url })
    : inferResourceType({ fileName: payload.fileName });

  await db
    .prepare(
      `UPDATE resources
       SET title = ?, url = ?, type = ?, tags = ?, presenter = ?, related_minutes_slug = ?, source_type = ?,
           file_key = ?, file_name = ?, file_size = ?, mime_type = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      payload.title,
      url,
      type,
      JSON.stringify(payload.tags),
      payload.submittedBy,
      payload.relatedMinutesSlug ?? null,
      payload.sourceType,
      payload.fileKey ?? null,
      payload.fileName ?? null,
      payload.fileSize ?? null,
      payload.mimeType ?? null,
      id,
    )
    .first();

  const resource = await getResourceItem(db, id, user);
  if (!resource) throw createError({ statusCode: 404, statusMessage: "Resource not found." });
  return { resource, previousFileKey: existing.file_key };
}

export async function deleteResourceItem(
  db: D1DatabaseLike,
  id: number,
  user?: ResourceUser,
): Promise<{ fileKey: string | null }> {
  const existing = user
    ? await getEditableResourceRow(db, id, user)
    : await getResourceRow(db, id);

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Resource not found." });
  }

  await db.prepare("DELETE FROM resources WHERE id = ?").bind(id).first();
  return { fileKey: existing.file_key };
}
