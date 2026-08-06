import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  insertNewsArticles,
  parseIngestArticle,
  requireCurrentJstDate,
  saveNewsDigest,
} from "~~/server/utils/news-ingest";

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);
  const type = body?.type;

  if (type !== "daily" && type !== "weekly") {
    throw createError({ statusCode: 400, statusMessage: 'type must be "daily" or "weekly".' });
  }

  const publishedDate = requireCurrentJstDate(body?.published_date, "published_date");
  const db = getDb(event);

  if (type === "weekly") {
    const overview = body?.overview;
    if (typeof overview !== "string" || !overview.trim()) {
      throw createError({ statusCode: 400, statusMessage: "overview is required for weekly." });
    }

    const urls = body?.article_urls;
    if (!Array.isArray(urls) || urls.some((url) => typeof url !== "string")) {
      throw createError({
        statusCode: 400,
        statusMessage: "article_urls must be an array of strings.",
      });
    }
    if (urls.length > 20) {
      throw createError({ statusCode: 400, statusMessage: "article_urls must have 20 items or fewer." });
    }

    const result = await saveNewsDigest(db, publishedDate, overview.trim(), urls as string[]);
    return { type, publishedDate, ...result };
  }

  const rawArticles = body?.articles;
  if (!Array.isArray(rawArticles) || rawArticles.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "articles must be a non-empty array." });
  }
  if (rawArticles.length > 20) {
    throw createError({ statusCode: 400, statusMessage: "articles must have 20 items or fewer." });
  }

  const articles = rawArticles.map(parseIngestArticle);
  const result = await insertNewsArticles(db, publishedDate, articles);

  return { type, publishedDate, ...result };
});
