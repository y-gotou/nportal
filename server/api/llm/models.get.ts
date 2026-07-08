import { createError } from "h3";
import { llmFetch, passthroughResponse } from "~~/server/utils/llm";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const upstream = await llmFetch(event, "/v1/models", { method: "GET" });

  return passthroughResponse(upstream);
});
