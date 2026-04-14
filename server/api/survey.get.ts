import { getQuery } from "h3";
import {
  getDb,
  getRequiredSurvey,
  getResponses,
  getUserAnswers,
  parseSurveyId,
} from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  const surveyId = parseSurveyId(
    getQuery(event).surveyId,
    "surveyId query parameter is required.",
  );

  const db = getDb(event);
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
  const survey = await getRequiredSurvey(db, surveyId, {
    includeDraft: user?.isAdmin === true,
  });
  const responses = await getResponses(db, surveyId);
  const myAnswers = user
    ? await getUserAnswers(db, surveyId, user.email)
    : undefined;

  return { survey, responses, myAnswers };
});
