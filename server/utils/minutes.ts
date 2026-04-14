import { createError } from "h3";
import type { D1DatabaseLike, Minutes, MinutesMeta } from "../../types/portal.ts";

interface MinutesRow {
  id: number;
  slug: string;
  title: string;
  date: string;
  attendees: string;
  topics: string;
  content_md: string;
  content_html: string;
}

function toMinutesMeta(row: MinutesRow): MinutesMeta {
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    attendees: JSON.parse(row.attendees) as string[],
    topics: JSON.parse(row.topics) as string[],
  };
}

function toMinutes(row: MinutesRow): Minutes {
  return {
    ...toMinutesMeta(row),
    contentMd: row.content_md,
    contentHtml: row.content_html,
  };
}

async function renderMarkdown(markdown: string): Promise<string> {
  // remark は ESM モジュールのため動的インポートを使用
  const { remark } = await import("remark");
  const { default: gfm } = await import("remark-gfm");
  const { default: html } = await import("remark-html");
  const result = await remark().use(gfm).use(html).process(markdown);
  return result.toString();
}

export async function listMinutes(db: D1DatabaseLike): Promise<MinutesMeta[]> {
  const { results } = await db
    .prepare("SELECT id, slug, title, date, attendees, topics FROM minutes ORDER BY date DESC")
    .all<MinutesRow>();
  return results.map(toMinutesMeta);
}

export async function getMinutesDetail(
  db: D1DatabaseLike,
  slug: string,
): Promise<Minutes | null> {
  const row = await db
    .prepare("SELECT * FROM minutes WHERE slug = ?")
    .bind(slug)
    .first<MinutesRow>();
  return row ? toMinutes(row) : null;
}

export async function getMinutesDetailById(
  db: D1DatabaseLike,
  id: number,
): Promise<Minutes | null> {
  const row = await db
    .prepare("SELECT * FROM minutes WHERE id = ?")
    .bind(id)
    .first<MinutesRow>();
  return row ? toMinutes(row) : null;
}

export interface MinutesPayload {
  slug: string;
  title: string;
  date: string;
  attendees: string[];
  topics: string[];
  contentMd: string;
}

export async function createMinutes(
  db: D1DatabaseLike,
  payload: MinutesPayload,
): Promise<Minutes> {
  const contentHtml = await renderMarkdown(payload.contentMd);
  await db
    .prepare(
      `INSERT INTO minutes (slug, title, date, attendees, topics, content_md, content_html)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.slug,
      payload.title,
      payload.date,
      JSON.stringify(payload.attendees),
      JSON.stringify(payload.topics),
      payload.contentMd,
      contentHtml,
    )
    .first();

  const created = await getMinutesDetail(db, payload.slug);
  if (!created) throw createError({ statusCode: 500, statusMessage: "Failed to create minutes" });
  return created;
}

export async function updateMinutes(
  db: D1DatabaseLike,
  slug: string,
  payload: Omit<MinutesPayload, "slug">,
): Promise<Minutes> {
  const contentHtml = await renderMarkdown(payload.contentMd);
  await db
    .prepare(
      `UPDATE minutes
       SET title = ?, date = ?, attendees = ?, topics = ?, content_md = ?, content_html = ?, updated_at = datetime('now')
       WHERE slug = ?`,
    )
    .bind(
      payload.title,
      payload.date,
      JSON.stringify(payload.attendees),
      JSON.stringify(payload.topics),
      payload.contentMd,
      contentHtml,
      slug,
    )
    .first();

  const updated = await getMinutesDetail(db, slug);
  if (!updated) throw createError({ statusCode: 404, statusMessage: "Minutes not found" });
  return updated;
}

export async function deleteMinutes(db: D1DatabaseLike, slug: string): Promise<void> {
  await db.prepare("DELETE FROM minutes WHERE slug = ?").bind(slug).first();
}
