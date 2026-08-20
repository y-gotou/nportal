import { requireUser } from "~~/server/utils/auth";
import { llmFetch, passthroughResponse } from "~~/server/utils/llm";

export default defineEventHandler(async (event) => {
  requireUser(event);

  const upstream = await llmFetch(event, "/v1/models", { method: "GET" });

  return passthroughResponse(upstream);
});
