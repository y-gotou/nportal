import { createError } from "h3";
import type { D1DatabaseLike, SpeakerApplication, SpeakerApplicationStatus } from "../../types/portal.ts";
import { DATE_PATTERN } from "../../shared/utils/date.ts";
import { parsePositiveIntParam } from "./params.ts";

function parseStatus(value: string): SpeakerApplicationStatus {
  if (value === "pending" || value === "scheduled" || value === "done") {
    return value;
  }
  return "pending";
}

function toApplication(row: Record<string, unknown>): SpeakerApplication {
  return {
    id: row.id as number,
    user_email: row.user_email as string,
    title: row.title as string,
    duration: row.duration as number,
    note: (row.note as string | null) ?? null,
    status: parseStatus(row.status as string),
    minutes_slug: (row.minutes_slug as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listSpeakerApplications(
  db: D1DatabaseLike,
): Promise<SpeakerApplication[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM speaker_applications
       ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END ASC,
         created_at DESC`,
    )
    .all<Record<string, unknown>>();

  return results.map(toApplication);
}

export interface SpeakerApplicationBody {
  title?: string;
  duration?: number;
  note?: string | null;
}

// post/put で共通のボディ検証と整形
export function parseSpeakerApplicationBody(
  body: SpeakerApplicationBody,
): { title: string; duration: number; note: string | null } {
  if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
    throw createError({ statusCode: 400, statusMessage: "title is required." });
  }

  const duration = Number(body.duration);
  if (!Number.isInteger(duration) || duration < 1) {
    throw createError({ statusCode: 400, statusMessage: "duration must be a positive integer." });
  }

  return {
    title: body.title.trim(),
    duration,
    note: typeof body.note === "string" ? body.note.trim() || null : null,
  };
}

export async function createSpeakerApplication(
  db: D1DatabaseLike,
  data: { title: string; duration: number; note?: string | null },
  userEmail: string,
): Promise<SpeakerApplication> {
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `INSERT INTO speaker_applications (user_email, title, duration, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)
       RETURNING *`,
    )
    .bind(userEmail, data.title, data.duration, data.note ?? null, now, now)
    .first<Record<string, unknown>>();

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create application." });
  }

  return toApplication(row);
}

export async function updateSpeakerApplication(
  db: D1DatabaseLike,
  id: number,
  data: { title: string; duration: number; note?: string | null },
  userEmail: string,
): Promise<SpeakerApplication> {
  const existing = await db
    .prepare("SELECT * FROM speaker_applications WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  if (existing.user_email !== userEmail) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden." });
  }

  if (existing.status === "done") {
    throw createError({ statusCode: 409, statusMessage: "Cannot edit a completed application." });
  }

  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `UPDATE speaker_applications
       SET title = ?, duration = ?, note = ?, updated_at = ?
       WHERE id = ?
       RETURNING *`,
    )
    .bind(data.title, data.duration, data.note ?? null, now, id)
    .first<Record<string, unknown>>();

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: "Failed to update application." });
  }

  return toApplication(row);
}

export async function deleteSpeakerApplication(
  db: D1DatabaseLike,
  id: number,
  userEmail: string,
): Promise<void> {
  const existing = await db
    .prepare("SELECT * FROM speaker_applications WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  if (existing.user_email !== userEmail) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden." });
  }

  if (existing.status === "done") {
    throw createError({ statusCode: 409, statusMessage: "Cannot withdraw a completed application." });
  }

  await db
    .prepare("DELETE FROM speaker_applications WHERE id = ?")
    .bind(id)
    .first();
}

export interface AdminSpeakerUpdates {
  status?: SpeakerApplicationStatus;
  // null は紐付け解除、undefined は変更なし
  minutesSlug?: string | null;
}

export async function adminUpdateSpeakerApplication(
  db: D1DatabaseLike,
  id: number,
  updates: AdminSpeakerUpdates,
): Promise<SpeakerApplication> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }

  if (updates.minutesSlug !== undefined) {
    if (updates.minutesSlug !== null && !DATE_PATTERN.test(updates.minutesSlug)) {
      throw createError({ statusCode: 400, statusMessage: "minutes_slug must be YYYY-MM-DD or null." });
    }
    sets.push("minutes_slug = ?");
    values.push(updates.minutesSlug);
  }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No fields to update." });
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());

  const row = await db
    .prepare(
      `UPDATE speaker_applications
       SET ${sets.join(", ")}
       WHERE id = ?
       RETURNING *`,
    )
    .bind(...values, id)
    .first<Record<string, unknown>>();

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  return toApplication(row);
}

export async function adminDeleteSpeakerApplication(
  db: D1DatabaseLike,
  id: number,
): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM speaker_applications WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  await db
    .prepare("DELETE FROM speaker_applications WHERE id = ?")
    .bind(id)
    .first();
}

export function parseSpeakerId(value: unknown): number {
  return parsePositiveIntParam(value, "Invalid application ID.");
}
