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
    resource_id: (row.resource_id as number | null) ?? null,
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

// ボディの resource_id を number | null へ整形する(空文字は解除扱い)
export function parseResourceIdInput(value: unknown): number | null {
  if (value === null || value === "") {
    return null;
  }

  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "resource_id must be a positive integer or null.",
    });
  }

  return id;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

function resourceConflictError() {
  return createError({
    statusCode: 409,
    statusMessage: "Resource is already linked to another application.",
  });
}

// 紐付け可能な資料かを検証する。submittedBy 指定時は本人が投稿した資料のみ許可する
async function assertLinkableResource(
  db: D1DatabaseLike,
  applicationId: number,
  resourceId: number,
  submittedBy?: string,
): Promise<void> {
  const resource = await db
    .prepare("SELECT id, submitted_by FROM resources WHERE id = ?")
    .bind(resourceId)
    .first<{ id: number; submitted_by: string | null }>();

  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: "Resource not found." });
  }

  if (submittedBy !== undefined && resource.submitted_by !== submittedBy) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden." });
  }

  const linked = await db
    .prepare("SELECT id FROM speaker_applications WHERE resource_id = ? AND id != ?")
    .bind(resourceId, applicationId)
    .first<{ id: number }>();

  if (linked) {
    throw resourceConflictError();
  }
}

// 紐付いた資料の未設定項目に応募側の値を反映する(設定済みの値は上書きしない)
export async function syncLinkedResourceFields(
  db: D1DatabaseLike,
  application: SpeakerApplication,
): Promise<void> {
  if (application.resource_id === null) {
    return;
  }

  await db
    .prepare(
      `UPDATE resources
       SET presenter = COALESCE(NULLIF(presenter, ''), ?),
           related_minutes_slug = COALESCE(NULLIF(related_minutes_slug, ''), ?),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(application.user_email, application.minutes_slug, application.resource_id)
    .first();
}

// 応募に資料を紐付ける。userEmail 指定時は本人の応募・本人が投稿した資料に限定する
export async function setSpeakerApplicationResource(
  db: D1DatabaseLike,
  id: number,
  resourceId: number | null,
  userEmail?: string,
): Promise<SpeakerApplication> {
  const existing = await db
    .prepare("SELECT user_email FROM speaker_applications WHERE id = ?")
    .bind(id)
    .first<{ user_email: string }>();

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  if (userEmail !== undefined && existing.user_email !== userEmail) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden." });
  }

  if (resourceId !== null) {
    await assertLinkableResource(db, id, resourceId, userEmail);
  }

  const row = await db
    .prepare(
      `UPDATE speaker_applications
       SET resource_id = ?, updated_at = ?
       WHERE id = ?
       RETURNING *`,
    )
    .bind(resourceId, new Date().toISOString(), id)
    .first<Record<string, unknown>>()
    .catch((error) => {
      if (isUniqueViolation(error)) throw resourceConflictError();
      throw error;
    });

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  const application = toApplication(row);
  await syncLinkedResourceFields(db, application);
  return application;
}

export interface AdminSpeakerUpdates {
  status?: SpeakerApplicationStatus;
  // null は紐付け解除、undefined は変更なし
  minutesSlug?: string | null;
  resourceId?: number | null;
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

  if (updates.resourceId !== undefined) {
    if (updates.resourceId !== null) {
      await assertLinkableResource(db, id, updates.resourceId);
    }
    sets.push("resource_id = ?");
    values.push(updates.resourceId);
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
    .first<Record<string, unknown>>()
    .catch((error) => {
      if (isUniqueViolation(error)) throw resourceConflictError();
      throw error;
    });

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Application not found." });
  }

  const application = toApplication(row);
  // 応募側の変更(minutes_slug 等)に資料側の未設定項目を追従させる
  await syncLinkedResourceFields(db, application);
  return application;
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
