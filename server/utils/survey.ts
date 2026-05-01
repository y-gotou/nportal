import { createError, type H3Event } from "h3";
import type {
  D1DatabaseLike,
  Survey,
  SurveyAnswerInput,
  SurveyQuestion,
  SurveyStatus,
  SurveyResponse,
} from "../../types/portal.ts";

interface SurveyRow {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  status: string;
  publish_starts_at?: string | null;
  response_deadline_at?: string | null;
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

interface ResponseRow {
  question_id: number;
  answer: string;
  submitted_at: string;
}

interface SubmissionRow {
  survey_id: number;
  user_email: string;
}

function parseSurveyOptions(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
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

function getTime(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function isAtOrBefore(value: string | null | undefined, now: Date) {
  const time = getTime(value);
  return time !== null && time <= now.getTime();
}

function isAfter(value: string | null | undefined, now: Date) {
  const time = getTime(value);
  return time !== null && time > now.getTime();
}

// 入力刻みは utils/survey.ts の SURVEY_SCHEDULE_GRANULARITY_MINUTES と一致させること。
function isQuarterHourDateTime(date: Date) {
  return date.getUTCMinutes() % 15 === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0;
}

export function getEffectiveSurveyStatus(
  row: Pick<SurveyRow, "status" | "publish_starts_at" | "response_deadline_at">,
  now = new Date(),
): SurveyStatus {
  const status = parseSurveyStatus(row.status, "Invalid survey status in database.");

  if (status !== "closed" && isAtOrBefore(row.response_deadline_at, now)) {
    return "closed";
  }

  if (status === "draft" && isAtOrBefore(row.publish_starts_at, now)) {
    return "active";
  }

  return status;
}

function isSurveyVisibleToUser(row: SurveyRow, now: Date) {
  const status = getEffectiveSurveyStatus(row, now);

  if (status === "draft") {
    return false;
  }

  if (status === "active" && isAfter(row.publish_starts_at, now)) {
    return false;
  }

  return true;
}

export function parseSurveyDateTime(
  value: unknown,
  message = "Invalid survey datetime.",
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw createError({ statusCode: 400, statusMessage: message });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime()) || !isQuarterHourDateTime(date)) {
    throw createError({ statusCode: 400, statusMessage: message });
  }

  return date.toISOString();
}

export function validateSurveyDateRange(
  publishStartsAt: string | null,
  responseDeadlineAt: string | null,
  message = "Invalid survey datetime range.",
): void {
  const publishTime = getTime(publishStartsAt);
  const deadlineTime = getTime(responseDeadlineAt);

  if (publishTime !== null && deadlineTime !== null && deadlineTime <= publishTime) {
    throw createError({ statusCode: 400, statusMessage: message });
  }
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
    allowOtherText: question.allow_other_text === 1,
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
  now = new Date(),
): Survey {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    status: getEffectiveSurveyStatus(row, now),
    publishStartsAt: row.publish_starts_at ?? null,
    responseDeadlineAt: row.response_deadline_at ?? null,
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
  options: { includeDraft?: boolean; now?: Date } = {},
): Promise<Survey[]> {
  const now = options.now ?? new Date();
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
    .filter((row) => options.includeDraft || isSurveyVisibleToUser(row, now))
    .map((row) => ({
      ...toSurvey(
        row,
        questionsBySurveyId.get(row.id) ?? [],
        responseCountBySurveyId.get(row.id) ?? 0,
        now,
      ),
      hasResponded: respondedSurveyIds.has(row.id),
    }));
}

export async function getSurvey(
  db: D1DatabaseLike,
  id: number,
  options: { includeDraft?: boolean; now?: Date } = {},
): Promise<Survey | null> {
  const now = options.now ?? new Date();
  const surveyRow = await db
    .prepare("SELECT * FROM surveys WHERE id = ?")
    .bind(id)
    .first<SurveyRow>();

  if (!surveyRow || (!options.includeDraft && !isSurveyVisibleToUser(surveyRow, now))) {
    return null;
  }

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY sort_order ASC")
    .bind(id)
    .all<QuestionRow>();

  const responseCountBySurveyId = await getSurveyResponseCounts(db);

  return toSurvey(surveyRow, questionRows, responseCountBySurveyId.get(id) ?? 0, now);
}

export async function getRequiredSurvey(
  db: D1DatabaseLike,
  id: number,
  options: { includeDraft?: boolean; now?: Date } = {},
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

export function isSurveyAcceptingResponses(survey: Survey, now = new Date()) {
  if (survey.status !== "active") {
    return false;
  }

  if (isAfter(survey.publishStartsAt, now)) {
    return false;
  }

  if (isAtOrBefore(survey.responseDeadlineAt, now)) {
    return false;
  }

  return true;
}

export async function updateSurveyPublicationStatuses(
  db: D1DatabaseLike,
  now = new Date(),
): Promise<void> {
  const nowText = now.toISOString();

  await db
    .prepare(
      `UPDATE surveys
       SET status = 'closed'
       WHERE status != 'closed'
         AND response_deadline_at IS NOT NULL
         AND response_deadline_at <= ?
         AND (status = 'active' OR (status = 'draft' AND publish_starts_at IS NOT NULL))`,
    )
    .bind(nowText)
    .first();

  await db
    .prepare(
      `UPDATE surveys
       SET status = 'active'
       WHERE status = 'draft'
         AND publish_starts_at IS NOT NULL
         AND publish_starts_at <= ?
         AND (response_deadline_at IS NULL OR response_deadline_at > ?)`,
    )
    .bind(nowText, nowText)
    .first();
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
