import { getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { getUser } from "~~/server/utils/auth";
import { getRequiredSurvey, parseSurveyId } from "~~/server/utils/survey";
import { getResponses, getUserAnswers } from "~~/server/utils/survey-response";

export default defineEventHandler(async (event) => {
  const surveyId = parseSurveyId(
    getQuery(event).surveyId,
    "surveyId query parameter is required.",
  );

  const db = getDb(event);
  const user = getUser(event);
  const survey = await getRequiredSurvey(db, surveyId, {
    includeDraft: user?.isAdmin === true,
  });
  const responses = await getResponses(db, surveyId);
  const myAnswers = user
    ? await getUserAnswers(db, surveyId, user.email)
    : undefined;

  return { survey, responses, myAnswers };
});
