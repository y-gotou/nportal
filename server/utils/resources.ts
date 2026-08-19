import { createError } from "h3";
import type { D1DatabaseLike, ResourceItem } from "../../types/portal.ts";
import { inferResourceType, isMarkdownFileName } from "./upload.ts";

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

export interface ResourceImageRow {
  id: number;
  resource_id: number;
  file_key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export interface ResourceUser {
  email: string;
  isAdmin?: boolean;
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
): Promise<{ fileKey: string | null; imageKeys: string[] }> {
  const existing = user
    ? await getEditableResourceRow(db, id, user)
    : await getResourceRow(db, id);

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Resource not found." });
  }

  const imageKeys = (await listResourceImages(db, id)).map((image) => image.file_key);
  await db.prepare("DELETE FROM resource_images WHERE resource_id = ?").bind(id).first();
  await db.prepare("DELETE FROM resources WHERE id = ?").bind(id).first();
  return { fileKey: existing.file_key, imageKeys };
}

export async function listResourceImages(
  db: D1DatabaseLike,
  resourceId: number,
): Promise<ResourceImageRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM resource_images WHERE resource_id = ? ORDER BY id")
    .bind(resourceId)
    .all<ResourceImageRow>();
  return results;
}

export async function getResourceImage(
  db: D1DatabaseLike,
  resourceId: number,
  imageId: number,
): Promise<ResourceImageRow | null> {
  return await db
    .prepare("SELECT * FROM resource_images WHERE id = ? AND resource_id = ?")
    .bind(imageId, resourceId)
    .first<ResourceImageRow>();
}

export async function createResourceImage(
  db: D1DatabaseLike,
  payload: {
    resourceId: number;
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO resource_images (resource_id, file_key, file_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(payload.resourceId, payload.fileKey, payload.fileName, payload.fileSize, payload.mimeType)
    .first();
}
