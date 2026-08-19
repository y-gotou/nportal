import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import {
  deleteSurveyResponses,
  hasSurveyResponseData,
  insertSurveyQuestions,
  type SurveyQuestionInput,
} from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid id");

  const body = await readBody<SurveyQuestionInput[] | { questions: SurveyQuestionInput[] }>(event);
  const questions = Array.isArray(body) ? body : body?.questions;

  if (!Array.isArray(questions)) {
    throw createError({ statusCode: 400, statusMessage: "Request body must be an array of questions" });
  }

  const db = getDb(event);
  const hasResponseData = await hasSurveyResponseData(db, id);

  if (hasResponseData) {
    throw createError({
      statusCode: 409,
      statusMessage: "Cannot edit questions for a survey that already has responses.",
    });
  }

  // 既存の設問と回答を削除してから再挿入（一括置換）
  await deleteSurveyResponses(db, id);
  await db.prepare("DELETE FROM questions WHERE survey_id = ?").bind(id).first();
  await insertSurveyQuestions(db, id, questions);

  return { success: true };
});
