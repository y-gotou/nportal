import { createError, readBody } from "h3";
import {
  addResponses,
  addSubmission,
  checkSubmission,
  getDb,
  getRequiredSurvey,
  parseSurveyId,
} from "~~/server/utils/survey";
import type { SurveyAnswerInput } from "~~/types/portal";

interface SubmitSurveyBody {
  surveyId?: number;
  responses?: SurveyAnswerInput[];
}

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody<SubmitSurveyBody>(event);

  if (!Array.isArray(body.responses)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid survey payload.",
    });
  }

  const surveyId = parseSurveyId(body.surveyId, "Invalid survey payload.");
  const responses = body.responses
    .filter((response) => Number.isInteger(response.questionId))
    .map((response) => ({
      questionId: response.questionId,
      answer: typeof response.answer === "string" ? response.answer : "",
    }));

  const db = getDb(event);
  await getRequiredSurvey(db, surveyId);

  // 重複回答チェック
  const alreadySubmitted = await checkSubmission(db, surveyId, user.email);
  if (alreadySubmitted) {
    throw createError({
      statusCode: 409,
      statusMessage: "You have already submitted this survey.",
    });
  }

  await addResponses(db, responses, user.email);
  await addSubmission(db, surveyId, user.email);

  return { success: true };
});
