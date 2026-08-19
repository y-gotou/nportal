import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import {
  insertSurveyQuestions,
  parseSurveyStatus,
  type SurveyQuestionInput,
} from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import type { SurveyStatus } from "~~/types/portal";

interface CreateSurveyBody {
  title?: string;
  description?: string;
  status?: SurveyStatus;
  questions?: SurveyQuestionInput[];
}

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const body = await readBody<CreateSurveyBody>(event);

  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: "title is required" });
  }

  const db = getDb(event);
  const status = body.status
    ? parseSurveyStatus(body.status, "Invalid survey payload.")
    : "draft";

  // アンケート作成
  const surveyResult = await db
    .prepare(
      `INSERT INTO surveys (title, description, status)
       VALUES (?, ?, ?)
       RETURNING id`,
    )
    .bind(
      body.title,
      body.description ?? "",
      status,
    )
    .first<{ id: number }>();

  if (!surveyResult) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create survey" });
  }

  const surveyId = surveyResult.id;

  // 設問を一括挿入
  await insertSurveyQuestions(db, surveyId, body.questions ?? []);

  return { surveyId };
});
