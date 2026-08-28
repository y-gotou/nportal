import { createError } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { streamR2Object } from "~~/server/utils/r2";
import {
  getResourceRow,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  requireUser(event);

  const id = parseResourceId(event.context.params?.id);
  const resource = await getResourceRow(getDb(event), id);

  if (!resource || resource.source_type !== "file" || !resource.file_key) {
    throw createError({ statusCode: 404, statusMessage: "Resource file not found." });
  }

  return await streamR2Object(event, resource.file_key, {
    fileName: resource.file_name,
    mimeType: resource.mime_type,
    notFoundMessage: "Resource file not found.",
    htmlInline: true,
  });
});
