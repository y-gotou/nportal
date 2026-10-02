import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { parseSurveyId } from "~~/server/utils/survey";
import { saveResponseComment } from "~~/server/utils/survey-response";
import { assertAdmin } from "~~/server/utils/admin";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const surveyId = parseSurveyId(event.context.params?.id, "Invalid id");
  const responseId = parsePositiveIntParam(
    event.context.params?.responseId,
    "Invalid response id",
  );
  const body = await readBody<{ comment?: unknown }>(event);

  await saveResponseComment(getDb(event), surveyId, responseId, body?.comment);

  return { success: true };
});
