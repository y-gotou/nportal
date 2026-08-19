import type {
  D1DatabaseLike,
  SurveyAnswerInput,
  SurveyResponse,
} from "../../types/portal.ts";

interface ResponseRow {
  question_id: number;
  answer: string;
  submitted_at: string;
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
