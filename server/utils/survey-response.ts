import { createError } from "h3";
import type {
  D1DatabaseLike,
  SurveyAnswerInput,
  SurveyQuestionType,
  SurveyResponse,
} from "../../types/portal.ts";
import {
  parseSurveySelectionAnswer,
  SURVEY_COMMENT_MAX_LENGTH,
} from "../../shared/utils/survey.ts";

interface ResponseRow {
  id: number;
  question_id: number;
  answer: string;
  submitted_at: string;
  comment: string | null;
  comment_updated_at: string | null;
}

export async function getResponses(
  db: D1DatabaseLike,
  surveyId: number,
): Promise<SurveyResponse[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.question_id, r.answer, r.submitted_at,
              c.body AS comment, c.updated_at AS comment_updated_at
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       LEFT JOIN response_comments c ON c.response_id = r.id
       WHERE q.survey_id = ?
       ORDER BY r.submitted_at DESC`,
    )
    .bind(surveyId)
    .all<ResponseRow>();

  return results.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    answer: row.answer,
    submittedAt: row.submitted_at,
    comment: row.comment,
    commentUpdatedAt: row.comment_updated_at,
  }));
}

// 空の本文は削除として扱う。コメントできるのは終了したアンケートの自由記述回答のみ
export async function saveResponseComment(
  db: D1DatabaseLike,
  surveyId: number,
  responseId: number,
  body: unknown,
): Promise<void> {
  const text = typeof body === "string" ? body.trim() : null;

  if (text === null || text.length > SURVEY_COMMENT_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: "Invalid comment." });
  }

  const target = await db
    .prepare(
      `SELECT r.answer, q.question_type, s.status
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       JOIN surveys s ON s.id = q.survey_id
       WHERE r.id = ? AND s.id = ?`,
    )
    .bind(responseId, surveyId)
    .first<{ answer: string; question_type: SurveyQuestionType; status: string }>();

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "Response not found." });
  }

  if (target.status !== "closed") {
    throw createError({
      statusCode: 409,
      statusMessage: "Comments are allowed only on closed surveys.",
    });
  }

  if (!parseSurveySelectionAnswer(target.answer, target.question_type).otherText.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Response has no free-text answer.",
    });
  }

  if (!text) {
    await db
      .prepare("DELETE FROM response_comments WHERE response_id = ?")
      .bind(responseId)
      .first();
    return;
  }

  await db
    .prepare(
      `INSERT INTO response_comments (response_id, body) VALUES (?, ?)
       ON CONFLICT(response_id) DO UPDATE
       SET body = excluded.body, updated_at = datetime('now')`,
    )
    .bind(responseId, text)
    .first();
}

export async function addResponses(
  db: D1DatabaseLike,
  responses: SurveyAnswerInput[],
  userEmail?: string,
): Promise<void> {
  const statement = db.prepare(
    "INSERT INTO responses (question_id, answer, user_email) VALUES (?, ?, ?)",
  );

  await db.batch(
    responses.map((response) =>
      statement.bind(response.questionId, response.answer, userEmail ?? null),
    ),
  );
}

export async function checkSubmission(
  db: D1DatabaseLike,
  surveyId: number,
  userEmail: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT id FROM submissions WHERE survey_id = ? AND user_email = ?",
    )
    .bind(surveyId, userEmail)
    .first<{ id: number }>();
  return row !== null;
}

export async function hasSurveyResponseData(
  db: D1DatabaseLike,
  surveyId: number,
): Promise<boolean> {
  const submissionRow = await db
    .prepare("SELECT id FROM submissions WHERE survey_id = ? LIMIT 1")
    .bind(surveyId)
    .first<{ id: number }>();

  if (submissionRow !== null) {
    return true;
  }

  const responseRow = await db
    .prepare(
      `SELECT r.id
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE q.survey_id = ?
       LIMIT 1`,
    )
    .bind(surveyId)
    .first<{ id: number }>();

  return responseRow !== null;
}

export async function addSubmission(
  db: D1DatabaseLike,
  surveyId: number,
  userEmail: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO submissions (survey_id, user_email) VALUES (?, ?)",
    )
    .bind(surveyId, userEmail)
    .first();
}

export async function deleteUserResponses(
  db: D1DatabaseLike,
  surveyId: number,
  userEmail: string,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM responses
       WHERE user_email = ?
         AND question_id IN (SELECT id FROM questions WHERE survey_id = ?)`,
    )
    .bind(userEmail, surveyId)
    .first();
}

export async function touchSubmission(
  db: D1DatabaseLike,
  surveyId: number,
  userEmail: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE submissions
       SET submitted_at = datetime('now')
       WHERE survey_id = ? AND user_email = ?`,
    )
    .bind(surveyId, userEmail)
    .first();
}

export async function getUserAnswers(
  db: D1DatabaseLike,
  surveyId: number,
  userEmail: string,
): Promise<Record<number, string>> {
  const { results } = await db
    .prepare(
      `SELECT r.question_id, r.answer
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE q.survey_id = ? AND r.user_email = ?`,
    )
    .bind(surveyId, userEmail)
    .all<{ question_id: number; answer: string }>();

  return Object.fromEntries(results.map((row) => [row.question_id, row.answer]));
}
