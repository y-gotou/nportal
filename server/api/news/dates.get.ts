import { getDb } from "~~/server/utils/survey";
import { listNewsDates } from "~~/server/utils/news";

export default defineEventHandler(async (event) => {
  return listNewsDates(getDb(event));
});
