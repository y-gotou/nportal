import { createError, readMultipartFormData } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  createResourceObjectKey,
  getEditableResourceRow,
  getResourcesBucket,
  normalizeResourceTags,
  parseResourceId,
  requireResourceTitle,
  sanitizeFileName,
  updateSubmittedResource,
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
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseResourceId(event.context.params?.id);
  const db = getDb(event);
  const existing = await getEditableResourceRow(db, id, user);

  const parts = await readMultipartFormData(event);
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: "multipart/form-data is required." });
  }

  const title = requireResourceTitle(getTextField(parts, "title"));
  const url = getTextField(parts, "url");
  const file = getFilePart(parts);

  if (url && file) {
    throw createError({ statusCode: 400, statusMessage: "Only one of url or file can be submitted." });
  }

  const common = {
    title,
    tags: getTags(getTextField(parts, "tags")),
    relatedMinutesSlug: getTextField(parts, "relatedMinutesSlug") || null,
    submittedBy: existing.submitted_by ?? user.email,
  };

  if (url) {
    const { resource, previousFileKey } = await updateSubmittedResource(db, id, {
      ...common,
      sourceType: "url",
      url: validateResourceUrl(url),
    }, user);

    if (previousFileKey) {
      await getResourcesBucket(event).delete(previousFileKey).catch(() => undefined);
    }

    return { resource };
  }

  if (file) {
    const fileName = sanitizeFileName(file.filename);
    const mimeType = file.type || "application/octet-stream";
    const size = file.data.byteLength;
    validateResourceFile({ fileName, size, mimeType });

    const bucket = getResourcesBucket(event);
    const fileKey = createResourceObjectKey(event, fileName);

    try {
      await bucket.put(fileKey, file.data, {
        httpMetadata: {
          contentType: mimeType,
          contentDisposition: `inline; filename="${fileName.replace(/"/g, "")}"`,
        },
        customMetadata: {
          submittedBy: existing.submitted_by ?? user.email,
          originalFileName: fileName,
        },
      });

      const { resource, previousFileKey } = await updateSubmittedResource(db, id, {
        ...common,
        sourceType: "file",
        fileKey,
        fileName,
        fileSize: size,
        mimeType,
      }, user);

      if (previousFileKey && previousFileKey !== fileKey) {
        await bucket.delete(previousFileKey).catch(() => undefined);
      }

      return { resource };
    } catch (error) {
      await bucket.delete(fileKey).catch(() => undefined);
      throw error;
    }
  }

  if (existing.source_type === "file" && existing.file_key) {
    const { resource } = await updateSubmittedResource(db, id, {
      ...common,
      sourceType: "file",
      fileKey: existing.file_key,
      fileName: existing.file_name,
      fileSize: existing.file_size,
      mimeType: existing.mime_type,
    }, user);
    return { resource };
  }

  const { resource } = await updateSubmittedResource(db, id, {
    ...common,
    sourceType: "url",
    url: existing.url,
  }, user);
  return { resource };
});
