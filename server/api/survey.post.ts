import { createError, readBody } from "h3";
import {
  addResponses,
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
  await addResponses(db, responses);

  return { success: true };
});
