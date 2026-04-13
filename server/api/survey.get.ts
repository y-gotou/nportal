import { getQuery } from "h3";
import {
  getDb,
  getRequiredSurvey,
  getResponses,
  parseSurveyId,
} from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  const surveyId = parseSurveyId(
    getQuery(event).surveyId,
    "surveyId query parameter is required.",
  );

  const db = getDb(event);
  const survey = await getRequiredSurvey(db, surveyId);
  const responses = await getResponses(db, surveyId);

  return { survey, responses };
});
