import { readBody } from "h3";
import {
  getDb,
  parseSurveyDateTime,
  parseSurveyStatus,
  validateSurveyDateRange,
} from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import type { SurveyStatus } from "~~/types/portal";

interface UpdateSurveyBody {
  title?: string;
  description?: string;
  status?: SurveyStatus;
  publishStartsAt?: string | null;
  responseDeadlineAt?: string | null;
}

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = Number(event.context.params?.id);
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid id" });

  const body = await readBody<UpdateSurveyBody>(event);

  const db = getDb(event);
  const status = body.status !== undefined
    ? parseSurveyStatus(body.status, "Invalid survey payload.")
    : undefined;
  const publishStartsAt = body.publishStartsAt !== undefined
    ? parseSurveyDateTime(body.publishStartsAt, "Invalid survey payload.")
    : undefined;
  const responseDeadlineAt = body.responseDeadlineAt !== undefined
    ? parseSurveyDateTime(body.responseDeadlineAt, "Invalid survey payload.")
    : undefined;

  if (publishStartsAt !== undefined || responseDeadlineAt !== undefined) {
    validateSurveyDateRange(
      publishStartsAt ?? null,
      responseDeadlineAt ?? null,
      "Invalid survey payload.",
    );
  }

  const sets: string[] = [];
  const binds: unknown[] = [];

  if (body.title !== undefined) {
    sets.push("title = ?", "description = ?");
    binds.push(body.title, body.description ?? "");
  }
  if (status !== undefined) {
    sets.push("status = ?");
    binds.push(status);
  }
  if (publishStartsAt !== undefined) {
    sets.push("publish_starts_at = ?");
    binds.push(publishStartsAt);
  }
  if (responseDeadlineAt !== undefined) {
    sets.push("response_deadline_at = ?");
    binds.push(responseDeadlineAt);
  }

  if (sets.length > 0) {
    await db
      .prepare(`UPDATE surveys SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...binds, id)
      .first();
  }

  return { success: true };
});
