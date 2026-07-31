import { createError, getQuery } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  getAdjacentNewsDates,
  getNewsUpdatedAt,
  listNewsArticles,
  resolveNewsDate,
} from "~~/server/utils/news";
import { parseNewsDate } from "~~/server/utils/news-date";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized." });
  }

  const db = getDb(event);
  const date = await resolveNewsDate(db, parseNewsDate(getQuery(event).date));

  if (!date) {
    return { date: null, updatedAt: null, prevDate: null, nextDate: null, articles: [] };
  }

  const [articles, adjacent, updatedAt] = await Promise.all([
    listNewsArticles(db, date, user.email),
    getAdjacentNewsDates(db, date),
    getNewsUpdatedAt(db, date),
  ]);

  return { date, updatedAt, ...adjacent, articles };
});
