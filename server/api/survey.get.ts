import { createError, getQuery } from "h3";
import { getDb, getResponses, getSurvey } from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  const surveyId = Number(getQuery(event).surveyId);

  if (!Number.isInteger(surveyId) || surveyId < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "surveyId query parameter is required.",
    });
  }

  const db = getDb(event);
  const survey = await getSurvey(db, surveyId);

  if (!survey) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found.",
    });
  }

  const responses = await getResponses(db, surveyId);
  return { survey, responses };
});
