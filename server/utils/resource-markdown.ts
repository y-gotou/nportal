import { sanitizeFileName } from "./upload.ts";
import type { ResourceImageRow } from "./resources.ts";

function getResourceImageUrl(resourceId: number, imageId: number): string {
  return `/api/resources/${resourceId}/images/${imageId}`;
}

function normalizeImageRefName(value: string): string {
  const basename = value.replace(/&amp;/g, "&").split("/").pop() ?? "";
  let decoded = basename;
  try {
    decoded = decodeURIComponent(basename);
  } catch {
    // percent-decode できない参照は原文のまま照合する
  }
  return sanitizeFileName(decoded).toLowerCase();
}

export function resolveMarkdownImageSources(
  html: string,
  resourceId: number,
  images: Pick<ResourceImageRow, "id" | "file_name">[],
): string {
  if (images.length === 0) return html;

  const urlByName = new Map(
    images.map((image) => [image.file_name.toLowerCase(), getResourceImageUrl(resourceId, image.id)]),
  );

  return html.replace(/(<img\b[^>]*\bsrc=")([^"]*)(")/g, (match, before, src, after) => {
    if (/^([a-z][a-z0-9+.-]*:|[/#?])/i.test(src)) return match;
    const url = urlByName.get(normalizeImageRefName(src));
    return url ? `${before}${url}${after}` : match;
  });
}
