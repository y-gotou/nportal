import { createError } from "h3";
import type { D1DatabaseLike, ResourceItem } from "../../types/portal.ts";

interface ResourceRow {
  id: number;
  title: string;
  url: string;
  type: string;
  tags: string;
  date: string;
  presenter: string | null;
  related_minutes_slug: string | null;
}

function toResourceItem(row: ResourceRow): ResourceItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    type: row.type,
    tags: JSON.parse(row.tags) as string[],
    date: row.date,
    presenter: row.presenter,
    relatedMinutesSlug: row.related_minutes_slug,
  };
}

export interface ListResourcesOptions {
  minutesSlug?: string;
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

  query += " ORDER BY date DESC";

  const stmt = db.prepare(query);
  const { results } = await (bindings.length > 0 ? stmt.bind(...bindings) : stmt).all<ResourceRow>();
  return results.map(toResourceItem);
}

export async function getResourceItem(
  db: D1DatabaseLike,
  id: number,
): Promise<ResourceItem | null> {
  const row = await db
    .prepare("SELECT * FROM resources WHERE id = ?")
    .bind(id)
    .first<ResourceRow>();
  return row ? toResourceItem(row) : null;
}

export interface ResourcePayload {
  title: string;
  url: string;
  type: string;
  tags: string[];
  date: string;
  presenter?: string | null;
  relatedMinutesSlug?: string | null;
}

export async function createResourceItem(
  db: D1DatabaseLike,
  payload: ResourcePayload,
): Promise<ResourceItem> {
  const result = await db
    .prepare(
      `INSERT INTO resources (title, url, type, tags, date, presenter, related_minutes_slug)
       VALUES (?, ?, ?, ?, ?, ?, ?)
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
    )
    .first<{ id: number }>();

  if (!result) throw createError({ statusCode: 500, statusMessage: "Failed to create resource" });
  const created = await getResourceItem(db, result.id);
  if (!created) throw createError({ statusCode: 500, statusMessage: "Failed to create resource" });
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
       SET title = ?, url = ?, type = ?, tags = ?, date = ?, presenter = ?, related_minutes_slug = ?, updated_at = datetime('now')
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

export async function deleteResourceItem(db: D1DatabaseLike, id: number): Promise<void> {
  await db.prepare("DELETE FROM resources WHERE id = ?").bind(id).first();
}
