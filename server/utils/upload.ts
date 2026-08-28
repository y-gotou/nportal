import { createError } from "h3";

export const MAX_RESOURCE_FILE_SIZE = 50 * 1024 * 1024;

const RESOURCE_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "PDF",
  ppt: "PowerPoint",
  pptx: "PowerPoint",
  doc: "Word",
  docx: "Word",
  xls: "Excel",
  xlsx: "Excel",
  csv: "CSV",
  txt: "Text",
  md: "Markdown",
  html: "HTML",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
  gif: "Image",
  webp: "Image",
  zip: "ZIP",
};

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ["application/pdf"],
  ppt: ["application/vnd.ms-powerpoint", "application/octet-stream"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/octet-stream"],
  doc: ["application/msword", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain", "application/octet-stream"],
  html: ["text/html", "application/octet-stream"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

const RESOURCE_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

function getBaseMimeType(value: string | null | undefined): string {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isResourceImageFileName(fileName: string | null | undefined): boolean {
  return RESOURCE_IMAGE_EXTENSIONS.has(getFileExtension(fileName ?? ""));
}

export function isMarkdownFileName(fileName: string | null | undefined): boolean {
  return getFileExtension(fileName ?? "") === "md";
}

export function isHtmlFileName(fileName: string | null | undefined): boolean {
  return getFileExtension(fileName ?? "") === "html";
}

export function normalizeResourceMimeType(fileName: string, mimeType?: string | null): string {
  if (isMarkdownFileName(fileName)) {
    return "text/markdown; charset=utf-8";
  }

  return mimeType?.trim() || "application/octet-stream";
}

export function sanitizeFileName(value: string | undefined): string {
  const name = (value ?? "resource")
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N} .()+,@_-]/gu, "_")
    .replace(/\s+/g, " ")
    .trim();

  return (name || "resource").slice(0, 180);
}

function encodeContentDispositionValue(value: string): string {
  return encodeURIComponent(value)
    .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildAsciiFileNameFallback(fileName: string): string {
  const fallback = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "")
    .replace(/[^\w .()+,@-]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return (fallback || "resource").slice(0, 180);
}

// HTML は既定でダウンロード(attachment)とする。CSP sandbox で隔離配信する経路のみ
// htmlInline を指定して inline にできる(server/utils/r2.ts の streamR2Object を参照)。
export function buildResourceContentDisposition(
  fileName: string | null | undefined,
  options: { htmlInline?: boolean } = {},
): string {
  const safeName = sanitizeFileName(fileName ?? "resource");
  const dispositionType = isHtmlFileName(safeName) && options.htmlInline !== true ? "attachment" : "inline";
  return `${dispositionType}; filename="${buildAsciiFileNameFallback(safeName)}"; filename*=UTF-8''${encodeContentDispositionValue(safeName)}`;
}

function getFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
  return match?.[1] ?? "";
}

export function inferResourceType(input: { fileName?: string | null; url?: string | null }): string {
  if (input.fileName) {
    const extension = getFileExtension(input.fileName);
    return RESOURCE_TYPE_BY_EXTENSION[extension] ?? "File";
  }

  if (input.url) {
    return "URL";
  }

  return "File";
}

export function validateResourceFile(
  file: { fileName: string; size: number; mimeType?: string | null },
  options: { allowZip?: boolean } = {},
) {
  if (file.size < 1) {
    throw createError({ statusCode: 400, statusMessage: "file is empty." });
  }

  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    throw createError({ statusCode: 413, statusMessage: "file exceeds the 50MB limit." });
  }

  const extension = getFileExtension(file.fileName);
  const allowedMimes = MIME_TYPES_BY_EXTENSION[extension];

  if (!allowedMimes) {
    throw createError({ statusCode: 400, statusMessage: "file extension is not allowed." });
  }

  if (extension === "zip" && options.allowZip !== true) {
    throw createError({
      statusCode: 403,
      statusMessage: "zip files can only be submitted by administrators.",
    });
  }

  const mimeType = getBaseMimeType(file.mimeType);
  if (mimeType && !allowedMimes.includes(mimeType)) {
    throw createError({ statusCode: 400, statusMessage: "file type is not allowed." });
  }
}
