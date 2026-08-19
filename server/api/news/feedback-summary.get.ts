import { getDb } from "~~/server/utils/db";
import { buildFeedbackSummary } from "~~/server/utils/news-feedback";

export default defineEventHandler(async (event) => {
  return buildFeedbackSummary(getDb(event));
});
