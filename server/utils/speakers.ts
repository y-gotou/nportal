import { createError } from "h3";
import type { D1DatabaseLike, SpeakerApplication, SpeakerApplicationStatus } from "../../types/portal";

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

export async function adminUpdateSpeakerStatus(
  db: D1DatabaseLike,
  id: number,
  status: SpeakerApplicationStatus,
): Promise<SpeakerApplication> {
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `UPDATE speaker_applications
       SET status = ?, updated_at = ?
       WHERE id = ?
       RETURNING *`,
    )
    .bind(status, now, id)
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
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: "Invalid application ID." });
  }
  return id;
}
