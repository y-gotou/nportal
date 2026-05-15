import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import { renderMarkdown } from "~~/server/utils/minutes";
import {
  getResourceItem,
  getResourceRow,
  getResourcesBucket,
  isMarkdownFileName,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

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

  return {
    resource,
    contentHtml: await renderMarkdown(markdown),
  };
});
