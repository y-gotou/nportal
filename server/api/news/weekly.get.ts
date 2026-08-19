import { createError, getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { getAdjacentDigestDates, getNewsDigest } from "~~/server/utils/news";
import { parseNewsDate } from "~~/server/utils/news-date";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized." });
  }

  const db = getDb(event);
  const digest = await getNewsDigest(
    db,
    parseNewsDate(getQuery(event).date),
    user.email,
  );

  if (!digest) {
    return { digest: null, prevDate: null, nextDate: null };
  }

  return { digest, ...(await getAdjacentDigestDates(db, digest.publishedDate)) };
});
