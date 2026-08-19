import { createError } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { streamR2Object } from "~~/server/utils/r2";
import {
  getResourceImage,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  requireUser(event);

  const id = parseResourceId(event.context.params?.id);
  const imageId = parseResourceId(event.context.params?.imageId);
  const image = await getResourceImage(getDb(event), id, imageId);

  if (!image) {
    throw createError({ statusCode: 404, statusMessage: "Resource image not found." });
  }

  return await streamR2Object(event, image.file_key, {
    fileName: image.file_name,
    mimeType: image.mime_type,
    notFoundMessage: "Resource image not found.",
    normalizeMimeType: false,
  });
});
