import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import type { SurveyQuestionType } from "~~/types/portal";

interface QuestionInput {
  questionText: string;
  questionType: SurveyQuestionType;
  options: string[];
}

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = Number(event.context.params?.id);
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid id" });

  const body = await readBody<QuestionInput[] | { questions: QuestionInput[] }>(event);
  const questions = Array.isArray(body) ? body : body?.questions;

  if (!Array.isArray(questions)) {
    throw createError({ statusCode: 400, statusMessage: "Request body must be an array of questions" });
  }

  const db = getDb(event);

  // 既存の設問と回答を削除してから再挿入（一括置換）
  const existingQuestions = await db
    .prepare("SELECT id FROM questions WHERE survey_id = ?")
    .bind(id)
    .all<{ id: number }>();

  if (existingQuestions.results.length > 0) {
    const deleteResp = db.prepare("DELETE FROM responses WHERE question_id = ?");
    await db.batch(existingQuestions.results.map((q) => deleteResp.bind(q.id)));
  }

  await db.prepare("DELETE FROM questions WHERE survey_id = ?").bind(id).first();

  if (questions.length > 0) {
    const stmt = db.prepare(
      "INSERT INTO questions (survey_id, question_text, question_type, options, sort_order) VALUES (?, ?, ?, ?, ?)",
    );
    await db.batch(
      questions.map((q, i) =>
        stmt.bind(
          id,
          q.questionText,
          q.questionType,
          JSON.stringify(q.options ?? []),
          i,
        ),
      ),
    );
  }

  return { success: true };
});
