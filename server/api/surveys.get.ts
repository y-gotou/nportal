import { getDb, listSurveys } from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  const surveys = await listSurveys(getDb(event), user?.email);
  return { surveys };
});
