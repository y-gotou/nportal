import { createError } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { renderMarkdown } from "~~/server/utils/minutes";
import { getResourcesBucket } from "~~/server/utils/r2";
import { isMarkdownFileName } from "~~/server/utils/upload";
import { resolveMarkdownImageSources } from "~~/server/utils/resource-markdown";
import {
  getResourceItem,
  getResourceRow,
  listResourceImages,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parseResourceId(event.context.params?.id);
  const db = getDb(event);
  const resourceRow = await getResourceRow(db, id);

  if (
    !resourceRow ||
    resourceRow.source_type !== "file" ||
    !resourceRow.file_key ||
    !isMarkdownFileName(resourceRow.file_name)
  ) {
    throw createError({ statusCode: 404, statusMessage: "Markdown resource not found." });
  }

  const object = await getResourcesBucket(event).get(resourceRow.file_key);
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: "Markdown resource not found." });
  }

  const markdown = await new Response(object.body).text();
  const resource = await getResourceItem(db, id, user);
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: "Markdown resource not found." });
  }

  const images = await listResourceImages(db, id);

  return {
    resource,
    contentHtml: resolveMarkdownImageSources(await renderMarkdown(markdown), id, images),
  };
});
