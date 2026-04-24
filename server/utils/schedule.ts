import { createError } from "h3";
import type { D1DatabaseLike, ScheduleItem } from "../../types/portal.ts";

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
  };
}

export async function listSchedule(db: D1DatabaseLike): Promise<ScheduleItem[]> {
  const { results } = await db
    .prepare(
      `SELECT schedule.*,
        (SELECT minutes.slug FROM minutes WHERE minutes.date = schedule.date LIMIT 1) AS resolved_minutes_slug
       FROM schedule
       ORDER BY schedule.date ASC`,
    )
    .all<ScheduleRow>();
  return results.map(toScheduleItem);
}

export async function getScheduleItem(
  db: D1DatabaseLike,
  id: number,
): Promise<ScheduleItem | null> {
  const row = await db
    .prepare(
      `SELECT schedule.*,
        (SELECT minutes.slug FROM minutes WHERE minutes.date = schedule.date LIMIT 1) AS resolved_minutes_slug
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
}

export async function createScheduleItem(
  db: D1DatabaseLike,
  payload: SchedulePayload,
): Promise<ScheduleItem> {
  const result = await db
    .prepare(
      `INSERT INTO schedule (date, time, title, meeting_url, minutes_slug, topics, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)
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
  await db
    .prepare(
      `UPDATE schedule
       SET date = ?, time = ?, title = ?, meeting_url = ?, minutes_slug = ?, topics = ?, location = ?, updated_at = datetime('now')
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
