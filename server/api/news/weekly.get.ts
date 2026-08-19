import { getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { getAdjacentDigestDates, getNewsDigest } from "~~/server/utils/news";
import { parseNewsDate } from "~~/server/utils/news-date";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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
