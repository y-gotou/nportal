import { createError, getRouterParam, readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { newsArticleExists, saveNewsVote } from "~~/server/utils/news";
import type { NewsVoteValue } from "~~/types/portal";

function parseVoteValue(value: unknown): NewsVoteValue {
  if (value === 1 || value === -1 || value === 0) {
    return value;
  }

  throw createError({
    statusCode: 400,
    statusMessage: "value must be 1, -1 or 0.",
  });
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const articleId = Number(getRouterParam(event, "id"));

  if (!Number.isInteger(articleId) || articleId <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Invalid article id." });
  }

  const body = await readBody<{ value?: unknown }>(event);
  const value = parseVoteValue(body?.value);

  const db = getDb(event);

  if (!(await newsArticleExists(db, articleId))) {
    throw createError({ statusCode: 404, statusMessage: "Article not found." });
  }

  return saveNewsVote(db, articleId, user.email, value);
});
