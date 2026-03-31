import { createError, type H3Event } from "h3";
import type {
  D1DatabaseLike,
  Survey,
  SurveyAnswerInput,
  SurveyQuestion,
  SurveyResponse,
} from "~~/types/portal";

interface SurveyRow {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  is_active: number;
}

interface QuestionRow {
  id: number;
  survey_id: number;
  question_text: string;
  question_type: SurveyQuestion["questionType"];
  options: string;
  sort_order: number;
}

interface ResponseRow {
  question_id: number;
  answer: string;
  submitted_at: string;
}

export function getDb(event: H3Event): D1DatabaseLike {
  const db = (
    event.context.cloudflare as { env?: { DB?: D1DatabaseLike } } | undefined
  )?.env?.DB;

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cloudflare D1 binding `DB` is not configured.",
    });
  }

  return db;
}

function toSurvey(row: SurveyRow, questions: QuestionRow[]): Survey {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    isActive: row.is_active === 1,
    questions: questions
      .filter((question) => question.survey_id === row.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((question) => ({
        id: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        options: JSON.parse(question.options || "[]") as string[],
      })),
  };
}

export async function listSurveys(db: D1DatabaseLike): Promise<Survey[]> {
  const { results: surveyRows } = await db
    .prepare("SELECT * FROM surveys ORDER BY created_at DESC")
    .all<SurveyRow>();

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions ORDER BY sort_order ASC")
    .all<QuestionRow>();

  return surveyRows.map((row) => toSurvey(row, questionRows));
}

export async function getSurvey(
  db: D1DatabaseLike,
  id: number,
): Promise<Survey | null> {
  const surveyRow = await db
    .prepare("SELECT * FROM surveys WHERE id = ?")
    .bind(id)
    .first<SurveyRow>();

  if (!surveyRow) {
    return null;
  }

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY sort_order ASC")
    .bind(id)
    .all<QuestionRow>();

  return toSurvey(surveyRow, questionRows);
}

export async function getResponses(
  db: D1DatabaseLike,
  surveyId: number,
): Promise<SurveyResponse[]> {
  const { results } = await db
    .prepare(
      `SELECT r.question_id, r.answer, r.submitted_at
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE q.survey_id = ?
       ORDER BY r.submitted_at DESC`,
    )
    .bind(surveyId)
    .all<ResponseRow>();

  return results.map((row) => ({
    questionId: row.question_id,
    answer: row.answer,
    submittedAt: row.submitted_at,
  }));
}

export async function addResponses(
  db: D1DatabaseLike,
  responses: SurveyAnswerInput[],
): Promise<void> {
  const statement = db.prepare(
    "INSERT INTO responses (question_id, answer) VALUES (?, ?)",
  );

  await db.batch(
    responses.map((response) =>
      statement.bind(response.questionId, response.answer),
    ),
  );
}
