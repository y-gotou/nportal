import { createError, getQuery } from "h3";
import { getDb } from "~~/server/utils/survey";
import { getLatestNewsDate, listNewsArticles } from "~~/server/utils/news";
import { parseNewsDate } from "~~/server/utils/news-date";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized." });
  }

  const db = getDb(event);
  const requestedDate = parseNewsDate(getQuery(event).date);
  const date = requestedDate ?? (await getLatestNewsDate(db));

  if (!date) {
    return { date: null, articles: [] };
  }

  return { date, articles: await listNewsArticles(db, date, user.email) };
});
