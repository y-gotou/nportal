import { createError, readMultipartFormData } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  buildResourceContentDisposition,
  createResourceImage,
  createResourceObjectKey,
  createSubmittedResource,
  getResourcesBucket,
  isMarkdownFileName,
  isResourceImageFileName,
  normalizeResourceTags,
  normalizeResourceMimeType,
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

function getImageParts(parts: Awaited<ReturnType<typeof readMultipartFormData>>) {
  return parts?.filter((item) => item.name === "images" && item.filename && item.data.byteLength > 0) ?? [];
}

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
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
  const submittedMimeType = file?.type || "application/octet-stream";
  const mimeType = normalizeResourceMimeType(fileName, submittedMimeType);
  const size = file?.data.byteLength ?? 0;
  validateResourceFile({ fileName, size, mimeType: submittedMimeType }, { allowZip: user.isAdmin === true });

  const imageParts = getImageParts(parts);
  if (imageParts.length > 0 && !isMarkdownFileName(fileName)) {
    throw createError({ statusCode: 400, statusMessage: "images can only be attached to a markdown file." });
  }

  const images = imageParts.map((part) => {
    const imageFileName = sanitizeFileName(part.filename);
    const imageMimeType = part.type || "application/octet-stream";

    if (!isResourceImageFileName(imageFileName)) {
      throw createError({ statusCode: 400, statusMessage: "attached images must be png, jpg, jpeg, gif, or webp." });
    }
    validateResourceFile({ fileName: imageFileName, size: part.data.byteLength, mimeType: imageMimeType });

    return {
      data: part.data,
      fileName: imageFileName,
      fileSize: part.data.byteLength,
      mimeType: normalizeResourceMimeType(imageFileName, imageMimeType),
    };
  });

  const db = getDb(event);
  const bucket = getResourcesBucket(event);
  const fileKey = createResourceObjectKey(event, fileName);
  const uploadedKeys: string[] = [];
  let createdResourceId: number | null = null;

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
    uploadedKeys.push(fileKey);

    const imageRecords: { fileKey: string; fileName: string; fileSize: number; mimeType: string }[] = [];
    for (const image of images) {
      const imageKey = createResourceObjectKey(event, image.fileName);
      await bucket.put(imageKey, image.data, {
        httpMetadata: {
          contentType: image.mimeType,
          contentDisposition: buildResourceContentDisposition(image.fileName),
        },
        customMetadata: {
          submittedBy: user.email,
          originalFileName: image.fileName,
        },
      });
      uploadedKeys.push(imageKey);
      imageRecords.push({
        fileKey: imageKey,
        fileName: image.fileName,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
      });
    }

    const resource = await createSubmittedResource(db, {
      ...common,
      sourceType: "file",
      fileKey,
      fileName,
      fileSize: size,
      mimeType,
    });
    createdResourceId = resource.id;

    for (const image of imageRecords) {
      await createResourceImage(db, { resourceId: resource.id, ...image });
    }
    return { resource };
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => bucket.delete(key).catch(() => undefined)));
    if (createdResourceId !== null) {
      await db.prepare("DELETE FROM resource_images WHERE resource_id = ?").bind(createdResourceId).first().catch(() => undefined);
      await db.prepare("DELETE FROM resources WHERE id = ?").bind(createdResourceId).first().catch(() => undefined);
    }
    throw error;
  }
});
