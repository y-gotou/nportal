import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { parseSurveyStatus } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import type { SurveyStatus } from "~~/types/portal";

interface UpdateSurveyBody {
  title?: string;
  description?: string;
  status?: SurveyStatus;
}

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid id");

  const body = await readBody<UpdateSurveyBody>(event);

  const db = getDb(event);
  const status = body.status !== undefined
    ? parseSurveyStatus(body.status, "Invalid survey payload.")
    : undefined;

  if (body.title !== undefined) {
    if (status !== undefined) {
      await db
        .prepare(
          "UPDATE surveys SET title = ?, description = ?, status = ? WHERE id = ?",
        )
        .bind(body.title, body.description ?? "", status, id)
        .first();
    } else {
      await db
        .prepare("UPDATE surveys SET title = ?, description = ? WHERE id = ?")
        .bind(body.title, body.description ?? "", id)
        .first();
    }
  }
  else if (status !== undefined) {
    await db
      .prepare("UPDATE surveys SET status = ? WHERE id = ?")
      .bind(status, id)
      .first();
  }

  return { success: true };
});
