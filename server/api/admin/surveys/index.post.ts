import { readBody } from "h3";
import { getDb, parseSurveyStatus } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import type { SurveyQuestionType, SurveyStatus } from "~~/types/portal";

interface QuestionInput {
  questionText: string;
  questionType: SurveyQuestionType;
  options: string[];
  allowOtherText?: boolean;
}

interface CreateSurveyBody {
  title?: string;
  description?: string;
  status?: SurveyStatus;
  questions?: QuestionInput[];
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
  const questions = body.questions ?? [];
  if (questions.length > 0) {
    const stmt = db.prepare(
      "INSERT INTO questions (survey_id, question_text, question_type, options, allow_other_text, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    );
    await db.batch(
      questions.map((q, i) =>
        stmt.bind(
          surveyId,
          q.questionText,
          q.questionType,
          JSON.stringify(q.options ?? []),
          q.allowOtherText ? 1 : 0,
          i,
        ),
      ),
    );
  }

  return { surveyId };
});
