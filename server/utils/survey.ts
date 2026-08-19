import { createError } from "h3";
import type {
  D1DatabaseLike,
  Survey,
  SurveyQuestion,
  SurveyStatus,
} from "../../types/portal.ts";
import { parsePositiveIntParam } from "./params.ts";
import { parseStringArray } from "../../shared/utils/json.ts";

interface SurveyRow {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  status: string;
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
  allow_other_text: number;
  sort_order: number;
}

interface SubmissionRow {
  survey_id: number;
  user_email: string;
}

export function parseSurveyId(
  value: unknown,
  message = "surveyId is required.",
): number {
  return parsePositiveIntParam(value, message);
}

export function parseSurveyStatus(
  value: unknown,
  message = "Invalid survey status.",
): SurveyStatus {
  if (value === "draft" || value === "active" || value === "closed") {
    return value;
  }

  throw createError({
    statusCode: 400,
    statusMessage: message,
  });
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
    options: parseStringArray(question.options),
    allowOtherText: question.allow_other_text === 1,
  };
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
    status: parseSurveyStatus(row.status, "Invalid survey status in database."),
    responseCount,
    questions: [...questions]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(toSurveyQuestion),
  };
}

async function getSurveyResponseCounts(db: D1DatabaseLike) {
  const { results: submissionCountRows } = await db
    .prepare(
      `SELECT survey_id, COUNT(*) AS response_count
       FROM submissions
       GROUP BY survey_id`,
    )
    .all<SurveyCountRow>();

  const { results: fallbackCountRows } = await db
    .prepare(
      `SELECT q.survey_id, COUNT(DISTINCT r.user_email) AS response_count
       FROM questions q
       JOIN responses r ON r.question_id = q.id
       WHERE r.user_email IS NOT NULL
       GROUP BY q.survey_id`,
    )
    .all<SurveyCountRow>();

  const { results: legacyCountRows } = await db
    .prepare(
      `SELECT q.survey_id, COUNT(r.id) AS response_count
       FROM questions q
       LEFT JOIN responses r ON r.question_id = q.id
       GROUP BY q.survey_id`,
    )
    .all<SurveyCountRow>();

  const submissionCountBySurveyId = new Map(
    submissionCountRows.map((row) => [row.survey_id, row.response_count]),
  );
  const fallbackCountBySurveyId = new Map(
    fallbackCountRows.map((row) => [row.survey_id, row.response_count]),
  );
  const legacyCountBySurveyId = new Map(
    legacyCountRows.map((row) => [row.survey_id, row.response_count]),
  );

  return new Map(
    [
      ...submissionCountBySurveyId.keys(),
      ...fallbackCountBySurveyId.keys(),
      ...legacyCountBySurveyId.keys(),
    ].map((surveyId) => [
      surveyId,
      submissionCountBySurveyId.get(surveyId)
        ?? fallbackCountBySurveyId.get(surveyId)
        ?? legacyCountBySurveyId.get(surveyId)
        ?? 0,
    ]),
  );
}

export async function listSurveys(
  db: D1DatabaseLike,
  userEmail?: string,
  options: { includeDraft?: boolean } = {},
): Promise<Survey[]> {
  const { results: surveyRows } = await db
    .prepare("SELECT * FROM surveys ORDER BY created_at DESC")
    .all<SurveyRow>();

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions ORDER BY sort_order ASC")
    .all<QuestionRow>();

  const questionsBySurveyId = groupQuestionsBySurveyId(questionRows);
  const responseCountBySurveyId = await getSurveyResponseCounts(db);

  // ユーザーの回答済みアンケートを取得
  const respondedSurveyIds = new Set<number>();
  if (userEmail) {
    const { results: submissionRows } = await db
      .prepare("SELECT survey_id FROM submissions WHERE user_email = ?")
      .bind(userEmail)
      .all<SubmissionRow>();
    for (const row of submissionRows) {
      respondedSurveyIds.add(row.survey_id);
    }
  }

  return surveyRows
    .filter((row) => options.includeDraft || row.status !== "draft")
    .map((row) => ({
      ...toSurvey(
        row,
        questionsBySurveyId.get(row.id) ?? [],
        responseCountBySurveyId.get(row.id) ?? 0,
      ),
      hasResponded: respondedSurveyIds.has(row.id),
    }));
}

export async function getSurvey(
  db: D1DatabaseLike,
  id: number,
  options: { includeDraft?: boolean } = {},
): Promise<Survey | null> {
  const surveyRow = await db
    .prepare("SELECT * FROM surveys WHERE id = ?")
    .bind(id)
    .first<SurveyRow>();

  if (!surveyRow || (!options.includeDraft && surveyRow.status === "draft")) {
    return null;
  }

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY sort_order ASC")
    .bind(id)
    .all<QuestionRow>();

  const responseCountBySurveyId = await getSurveyResponseCounts(db);

  return toSurvey(surveyRow, questionRows, responseCountBySurveyId.get(id) ?? 0);
}

export interface SurveyQuestionInput {
  questionText: string;
  questionType: SurveyQuestion["questionType"];
  // 選択肢の配列。DB の JSON 文字列をそのまま渡すことも可
  options: string[] | string;
  allowOtherText?: boolean | number;
}

// 設問を sort_order 付きで一括挿入する
export async function insertSurveyQuestions(
  db: D1DatabaseLike,
  surveyId: number,
  questions: SurveyQuestionInput[],
): Promise<void> {
  if (questions.length === 0) return;

  const statement = db.prepare(
    "INSERT INTO questions (survey_id, question_text, question_type, options, allow_other_text, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  );
  await db.batch(
    questions.map((question, index) =>
      statement.bind(
        surveyId,
        question.questionText,
        question.questionType,
        typeof question.options === "string"
          ? question.options
          : JSON.stringify(question.options ?? []),
        question.allowOtherText ? 1 : 0,
        index,
      ),
    ),
  );
}

// アンケート配下の設問に紐づく回答をすべて削除する
export async function deleteSurveyResponses(
  db: D1DatabaseLike,
  surveyId: number,
): Promise<void> {
  const { results } = await db
    .prepare("SELECT id FROM questions WHERE survey_id = ?")
    .bind(surveyId)
    .all<{ id: number }>();

  if (results.length === 0) return;

  const statement = db.prepare("DELETE FROM responses WHERE question_id = ?");
  await db.batch(results.map((question) => statement.bind(question.id)));
}

export async function duplicateSurvey(
  db: D1DatabaseLike,
  sourceSurveyId: number,
): Promise<number> {
  const sourceRow = await db
    .prepare("SELECT * FROM surveys WHERE id = ?")
    .bind(sourceSurveyId)
    .first<SurveyRow>();

  if (!sourceRow) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found.",
    });
  }

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY sort_order ASC")
    .bind(sourceSurveyId)
    .all<QuestionRow>();

  const created = await db
    .prepare(
      `INSERT INTO surveys (title, description, status)
       VALUES (?, ?, 'draft')
       RETURNING id`,
    )
    .bind(`(コピー) ${sourceRow.title}`, sourceRow.description ?? "")
    .first<{ id: number }>();

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to duplicate survey.",
    });
  }

  await insertSurveyQuestions(
    db,
    created.id,
    questionRows.map((question) => ({
      questionText: question.question_text,
      questionType: question.question_type,
      options: question.options,
      allowOtherText: question.allow_other_text,
    })),
  );

  return created.id;
}

export async function getRequiredSurvey(
  db: D1DatabaseLike,
  id: number,
  options: { includeDraft?: boolean } = {},
): Promise<Survey> {
  const survey = await getSurvey(db, id, options);

  if (!survey) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found.",
    });
  }

  return survey;
}
