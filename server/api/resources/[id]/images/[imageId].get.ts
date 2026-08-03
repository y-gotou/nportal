import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  buildResourceContentDisposition,
  getResourceImage,
  getResourcesBucket,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseResourceId(event.context.params?.id);
  const imageId = parseResourceId(event.context.params?.imageId);
  const image = await getResourceImage(getDb(event), id, imageId);

  if (!image) {
    throw createError({ statusCode: 404, statusMessage: "Resource image not found." });
  }

  const object = await getResourcesBucket(event).get(image.file_key);
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: "Resource image not found." });
  }

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("Content-Type", image.mime_type || headers.get("Content-Type") || "application/octet-stream");
  headers.set("Content-Disposition", buildResourceContentDisposition(image.file_name));
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(object.body, { headers });
});
