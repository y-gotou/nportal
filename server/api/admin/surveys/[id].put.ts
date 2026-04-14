import { readBody } from "h3";
import { getDb, parseSurveyStatus } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import type { SurveyStatus } from "~~/types/portal";

interface UpdateSurveyBody {
  title?: string;
  description?: string;
  status?: SurveyStatus;
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
