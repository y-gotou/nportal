import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";

interface UpdateSurveyBody {
  title?: string;
  description?: string;
  isActive?: boolean;
}

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = Number(event.context.params?.id);
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid id" });

  const body = await readBody<UpdateSurveyBody>(event);

  const db = getDb(event);

  // isActive のみ更新する部分更新に対応
  if (body.title !== undefined) {
    await db
      .prepare(
        "UPDATE surveys SET title = ?, description = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(body.title, body.description ?? "", body.isActive !== false ? 1 : 0, id)
      .first();
  }
  else if (body.isActive !== undefined) {
    await db
      .prepare("UPDATE surveys SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.isActive ? 1 : 0, id)
      .first();
  }

  return { success: true };
});
