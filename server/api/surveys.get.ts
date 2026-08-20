import { getDb } from "~~/server/utils/db";
import { getUser } from "~~/server/utils/auth";
import { listSurveys } from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  const user = getUser(event);
  const surveys = await listSurveys(getDb(event), user?.email, {
    includeDraft: user?.isAdmin === true,
  });
  return { surveys };
});
