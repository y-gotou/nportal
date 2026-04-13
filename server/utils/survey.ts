import { createError, type H3Event } from "h3";
import type {
  D1DatabaseLike,
  Survey,
  SurveyAnswerInput,
  SurveyQuestion,
  SurveyResponse,
} from "../../types/portal.ts";
import { parseSurveyOptions } from "../../utils/survey.ts";

interface SurveyRow {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  is_active: number;
}

interface SurveyCountRow {
  survey_id: number;
  response_count: number;
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

export function parseSurveyId(
  value: unknown,
  message = "surveyId is required.",
): number {
  const surveyId = Number(value);

  if (!Number.isInteger(surveyId) || surveyId < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: message,
    });
  }

  return surveyId;
}

function groupQuestionsBySurveyId(questionRows: QuestionRow[]) {
  const grouped = new Map<number, QuestionRow[]>();

  for (const question of questionRows) {
    const questions = grouped.get(question.survey_id) ?? [];
    questions.push(question);
    grouped.set(question.survey_id, questions);
  }

  return grouped;
}

function toSurveyQuestion(question: QuestionRow): SurveyQuestion {
  return {
    id: question.id,
    questionText: question.question_text,
    questionType: question.question_type,
    options: parseSurveyOptions(question.options),
  };
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

function toSurvey(
  row: SurveyRow,
  questions: QuestionRow[],
  responseCount?: number,
): Survey {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    isActive: row.is_active === 1,
    responseCount,
    questions: [...questions]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(toSurveyQuestion),
  };
}

export async function listSurveys(db: D1DatabaseLike): Promise<Survey[]> {
  const { results: surveyRows } = await db
    .prepare("SELECT * FROM surveys ORDER BY created_at DESC")
    .all<SurveyRow>();

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions ORDER BY sort_order ASC")
    .all<QuestionRow>();

  const { results: countRows } = await db
    .prepare(
      `SELECT q.survey_id, COUNT(r.id) AS response_count
       FROM questions q
       LEFT JOIN responses r ON r.question_id = q.id
       GROUP BY q.survey_id`,
    )
    .all<SurveyCountRow>();

  const questionsBySurveyId = groupQuestionsBySurveyId(questionRows);
  const responseCountBySurveyId = new Map(
    countRows.map((row) => [row.survey_id, row.response_count]),
  );

  return surveyRows.map((row) =>
    toSurvey(
      row,
      questionsBySurveyId.get(row.id) ?? [],
      responseCountBySurveyId.get(row.id) ?? 0,
    ),
  );
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

export async function getRequiredSurvey(
  db: D1DatabaseLike,
  id: number,
): Promise<Survey> {
  const survey = await getSurvey(db, id);

  if (!survey) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found.",
    });
  }

  return survey;
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
