import { getDb } from "~~/server/utils/survey";
import { buildFeedbackSummary } from "~~/server/utils/news-feedback";

export default defineEventHandler(async (event) => {
  return buildFeedbackSummary(getDb(event));
});
