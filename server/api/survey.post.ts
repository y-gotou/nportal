import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import {
  addResponses,
  addSubmission,
  checkSubmission,
  deleteUserResponses,
  getRequiredSurvey,
  parseSurveyId,
  touchSubmission,
} from "~~/server/utils/survey";
import type { SurveyAnswerInput } from "~~/types/portal";

interface SubmitSurveyBody {
  surveyId?: number;
  responses?: SurveyAnswerInput[];
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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
  const survey = await getRequiredSurvey(db, surveyId);

  if (survey.status !== "active") {
    throw createError({
      statusCode: 409,
      statusMessage: "Survey is not accepting responses.",
    });
  }

  const alreadySubmitted = await checkSubmission(db, surveyId, user.email);

  if (alreadySubmitted) {
    await deleteUserResponses(db, surveyId, user.email);
    await addResponses(db, responses, user.email);
    await touchSubmission(db, surveyId, user.email);
  } else {
    await addResponses(db, responses, user.email);
    await addSubmission(db, surveyId, user.email);
  }

  return { success: true };
});
