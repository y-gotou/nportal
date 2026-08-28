import { createError, readMultipartFormData } from "h3";
import { getDb } from "~~/server/utils/db";
import { getFilePart, getFileParts, getTextField } from "~~/server/utils/multipart";
import { requireUser } from "~~/server/utils/auth";
import { createResourceObjectKey, getResourcesBucket, toR2ObjectBody } from "~~/server/utils/r2";
import {
  buildResourceContentDisposition,
  isMarkdownFileName,
  isResourceImageFileName,
  normalizeResourceMimeType,
  sanitizeFileName,
  validateResourceFile,
} from "~~/server/utils/upload";
import {
  createResourceImage,
  createSubmittedResource,
  normalizeResourceTags,
  requireResourceTitle,
  validateResourceUrl,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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
    tags: normalizeResourceTags(getTextField(parts, "tags").split(",")),
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

  const imageParts = getFileParts(parts, "images");
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
    await bucket.put(fileKey, file?.data ? toR2ObjectBody(file.data) : null, {
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
      await bucket.put(imageKey, toR2ObjectBody(image.data), {
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
