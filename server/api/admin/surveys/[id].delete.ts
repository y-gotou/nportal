import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { deleteSurveyResponses } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid id");

  const db = getDb(event);

  // 関連データを連鎖削除（responses → submissions → questions → surveys の順）
  await deleteSurveyResponses(db, id);
  await db.prepare("DELETE FROM submissions WHERE survey_id = ?").bind(id).first();
  await db.prepare("DELETE FROM questions WHERE survey_id = ?").bind(id).first();
  await db.prepare("DELETE FROM surveys WHERE id = ?").bind(id).first();

  return { success: true };
});
