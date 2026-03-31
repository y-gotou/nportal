import { createError, readBody } from "h3";
import { addResponses, getDb, getSurvey } from "~~/server/utils/survey";
import type { SurveyAnswerInput } from "~~/types/portal";

interface SubmitSurveyBody {
  surveyId?: number;
  responses?: SurveyAnswerInput[];
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubmitSurveyBody>(event);
  const surveyId = Number(body.surveyId);

  if (!Number.isInteger(surveyId) || surveyId < 1 || !Array.isArray(body.responses)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid survey payload.",
    });
  }

  const responses = body.responses
    .filter((response) => Number.isInteger(response.questionId))
    .map((response) => ({
      questionId: response.questionId,
      answer: typeof response.answer === "string" ? response.answer : "",
    }));

  const db = getDb(event);
  const survey = await getSurvey(db, surveyId);

  if (!survey) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found.",
    });
  }

  await addResponses(db, responses);

  return { success: true };
});
