import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  getResourceRow,
  getResourcesBucket,
  parseResourceId,
} from "~~/server/utils/resources";

function buildContentDisposition(fileName: string | null): string {
  const safeName = (fileName || "resource").replace(/"/g, "");
  return `inline; filename="${safeName}"`;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseResourceId(event.context.params?.id);
  const resource = await getResourceRow(getDb(event), id);

  if (!resource || resource.source_type !== "file" || !resource.file_key) {
    throw createError({ statusCode: 404, statusMessage: "Resource file not found." });
  }

  const object = await getResourcesBucket(event).get(resource.file_key);
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: "Resource file not found." });
  }

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("Content-Type", resource.mime_type || headers.get("Content-Type") || "application/octet-stream");
  headers.set("Content-Disposition", buildContentDisposition(resource.file_name));
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(object.body, { headers });
});
