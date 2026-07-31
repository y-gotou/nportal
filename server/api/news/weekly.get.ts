import { createError, getQuery } from "h3";
import { getDb } from "~~/server/utils/survey";
import { getNewsDigest } from "~~/server/utils/news";
import { parseNewsDate } from "~~/server/utils/news-date";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized." });
  }

  const db = getDb(event);
  const date = parseNewsDate(getQuery(event).date) ?? null;

  return { digest: await getNewsDigest(db, date, user.email) };
});
