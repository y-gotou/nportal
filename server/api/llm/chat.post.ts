import { createError, readRawBody } from "h3";
import { llmFetch, passthroughResponse } from "~~/server/utils/llm";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readRawBody(event, "utf8");
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body is required.",
    });
  }

  const upstream = await llmFetch(event, "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return passthroughResponse(upstream);
});
