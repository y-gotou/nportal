import { getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import {
  getAdjacentNewsDates,
  getNewsUpdatedAt,
  listNewsArticles,
  resolveNewsDate,
} from "~~/server/utils/news";
import { parseNewsDate } from "~~/server/utils/news-date";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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
