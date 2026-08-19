import { getDb } from "~~/server/utils/db";
import { duplicateSurvey, parseSurveyId } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseSurveyId(event.context.params?.id, "Invalid id");
  const db = getDb(event);
  const surveyId = await duplicateSurvey(db, id);

  return { surveyId };
});
