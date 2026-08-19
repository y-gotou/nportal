import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { assertAdmin } from "~~/server/utils/admin";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid id");

  const db = getDb(event);

  // 関連データを連鎖削除（responses → submissions → questions → surveys の順）
  const questionIds = await db
    .prepare("SELECT id FROM questions WHERE survey_id = ?")
    .bind(id)
    .all<{ id: number }>();

  if (questionIds.results.length > 0) {
    const deleteResp = db.prepare("DELETE FROM responses WHERE question_id = ?");
    await db.batch(questionIds.results.map((q) => deleteResp.bind(q.id)));
  }

  await db.prepare("DELETE FROM submissions WHERE survey_id = ?").bind(id).first();
  await db.prepare("DELETE FROM questions WHERE survey_id = ?").bind(id).first();
  await db.prepare("DELETE FROM surveys WHERE id = ?").bind(id).first();

  return { success: true };
});
