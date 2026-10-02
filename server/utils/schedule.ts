import { createError } from "h3";
import type { D1DatabaseLike, ScheduleItem } from "../../types/portal.ts";
import { renderMarkdown } from "./minutes.ts";

interface ScheduleRow {
  id: number;
  date: string;
  time: string;
  title: string;
  meeting_url: string | null;
  minutes_slug: string | null;
  resolved_minutes_slug?: string | null;
  topics: string;
  location: string | null;
  agenda?: string | null;
  agenda_html?: string | null;
  has_chat?: number;
}

function toScheduleItem(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    title: row.title,
    meetingUrl: row.meeting_url,
    minutesSlug: row.resolved_minutes_slug ?? null,
    topics: JSON.parse(row.topics) as string[],
    location: row.location,
    agenda: row.agenda ?? null,
    agendaHtml: row.agenda_html ?? null,
    hasChat: (row.has_chat ?? 0) === 1,
  };
}

export async function listSchedule(db: D1DatabaseLike): Promise<ScheduleItem[]> {
  const { results } = await db
    .prepare(
      `SELECT schedule.*,
        (SELECT minutes.slug FROM minutes WHERE minutes.date = schedule.date LIMIT 1) AS resolved_minutes_slug,
        EXISTS(SELECT 1 FROM chat_messages WHERE chat_messages.schedule_id = schedule.id AND chat_messages.deleted_at IS NULL) AS has_chat
       FROM schedule
       ORDER BY schedule.date ASC`,
    )
    .all<ScheduleRow>();
  return results.map(toScheduleItem);
}

async function getScheduleItem(
  db: D1DatabaseLike,
  id: number,
): Promise<ScheduleItem | null> {
  const row = await db
    .prepare(
      `SELECT schedule.*,
        (SELECT minutes.slug FROM minutes WHERE minutes.date = schedule.date LIMIT 1) AS resolved_minutes_slug,
        EXISTS(SELECT 1 FROM chat_messages WHERE chat_messages.schedule_id = schedule.id AND chat_messages.deleted_at IS NULL) AS has_chat
       FROM schedule
       WHERE schedule.id = ?`,
    )
    .bind(id)
    .first<ScheduleRow>();
  return row ? toScheduleItem(row) : null;
}

export interface SchedulePayload {
  date: string;
  time: string;
  title: string;
  meetingUrl?: string | null;
  topics: string[];
  location?: string | null;
  agenda?: string | null;
}

// post/put で共通のボディ検証と整形
export function parseSchedulePayload(body: Partial<SchedulePayload>): SchedulePayload {
  if (!body.date || !body.time || !body.title) {
    throw createError({ statusCode: 400, statusMessage: "date, time, title are required" });
  }

  return {
    date: body.date,
    time: body.time,
    title: body.title,
    meetingUrl: body.meetingUrl ?? null,
    topics: Array.isArray(body.topics) ? body.topics : [],
    location: body.location ?? null,
    agenda: typeof body.agenda === "string" ? body.agenda.trim() || null : null,
  };
}

export async function createScheduleItem(
  db: D1DatabaseLike,
  payload: SchedulePayload,
): Promise<ScheduleItem> {
  const agendaHtml = payload.agenda ? await renderMarkdown(payload.agenda) : null;
  const result = await db
    .prepare(
      `INSERT INTO schedule (date, time, title, meeting_url, minutes_slug, topics, location, agenda, agenda_html)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      payload.date,
      payload.time,
      payload.title,
      payload.meetingUrl ?? null,
      null,
      JSON.stringify(payload.topics),
      payload.location ?? null,
      payload.agenda ?? null,
      agendaHtml,
    )
    .first<{ id: number }>();

  if (!result) throw createError({ statusCode: 500, statusMessage: "Failed to create schedule" });
  const created = await getScheduleItem(db, result.id);
  if (!created) throw createError({ statusCode: 500, statusMessage: "Failed to create schedule" });
  return created;
}

export async function updateScheduleItem(
  db: D1DatabaseLike,
  id: number,
  payload: SchedulePayload,
): Promise<ScheduleItem> {
  const agendaHtml = payload.agenda ? await renderMarkdown(payload.agenda) : null;
  await db
    .prepare(
      `UPDATE schedule
       SET date = ?, time = ?, title = ?, meeting_url = ?, minutes_slug = ?, topics = ?, location = ?, agenda = ?, agenda_html = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      payload.date,
      payload.time,
      payload.title,
      payload.meetingUrl ?? null,
      null,
      JSON.stringify(payload.topics),
      payload.location ?? null,
      payload.agenda ?? null,
      agendaHtml,
      id,
    )
    .first();

  const updated = await getScheduleItem(db, id);
  if (!updated) throw createError({ statusCode: 404, statusMessage: "Schedule item not found" });
  return updated;
}

export async function deleteScheduleItem(db: D1DatabaseLike, id: number): Promise<void> {
  await db.prepare("DELETE FROM schedule WHERE id = ?").bind(id).first();
}
