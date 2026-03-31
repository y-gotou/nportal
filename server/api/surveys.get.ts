import { getDb, listSurveys } from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  const surveys = await listSurveys(getDb(event));
  return { surveys };
});
