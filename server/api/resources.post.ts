import { createError, readMultipartFormData } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  buildResourceContentDisposition,
  createResourceObjectKey,
  createSubmittedResource,
  getResourcesBucket,
  normalizeResourceTags,
  requireResourceTitle,
  sanitizeFileName,
  validateResourceFile,
  validateResourceUrl,
} from "~~/server/utils/resources";

function getTextField(parts: Awaited<ReturnType<typeof readMultipartFormData>>, name: string): string {
  const part = parts?.find((item) => item.name === name && !item.filename);
  return part?.data.toString("utf8").trim() ?? "";
}

function getTags(value: string): string[] {
  return normalizeResourceTags(value.split(","));
}

function getFilePart(parts: Awaited<ReturnType<typeof readMultipartFormData>>) {
  return parts?.find((item) => item.name === "file" && item.filename && item.data.byteLength > 0);
}

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const parts = await readMultipartFormData(event);
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: "multipart/form-data is required." });
  }

  const title = requireResourceTitle(getTextField(parts, "title"));
  const url = getTextField(parts, "url");
  const file = getFilePart(parts);

  if ((url && file) || (!url && !file)) {
    throw createError({ statusCode: 400, statusMessage: "Either url or file is required." });
  }

  const common = {
    title,
    tags: getTags(getTextField(parts, "tags")),
    relatedMinutesSlug: getTextField(parts, "relatedMinutesSlug") || null,
    submittedBy: user.email,
  };

  if (url) {
    const resource = await createSubmittedResource(getDb(event), {
      ...common,
      sourceType: "url",
      url: validateResourceUrl(url),
    });
    return { resource };
  }

  const fileName = sanitizeFileName(file?.filename);
  const mimeType = file?.type || "application/octet-stream";
  const size = file?.data.byteLength ?? 0;
  validateResourceFile({ fileName, size, mimeType });

  const bucket = getResourcesBucket(event);
  const fileKey = createResourceObjectKey(event, fileName);

  try {
    await bucket.put(fileKey, file?.data ?? null, {
      httpMetadata: {
        contentType: mimeType,
        contentDisposition: buildResourceContentDisposition(fileName),
      },
      customMetadata: {
        submittedBy: user.email,
        originalFileName: fileName,
      },
    });

    const resource = await createSubmittedResource(getDb(event), {
      ...common,
      sourceType: "file",
      fileKey,
      fileName,
      fileSize: size,
      mimeType,
    });
    return { resource };
  } catch (error) {
    await bucket.delete(fileKey).catch(() => undefined);
    throw error;
  }
});
