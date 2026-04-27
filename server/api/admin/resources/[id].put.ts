import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import {
  getResourceRow,
  getResourcesBucket,
  parseResourceId,
  updateResourceItem,
  type ResourcePayload,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseResourceId(event.context.params?.id);

  const body = await readBody<Partial<ResourcePayload>>(event);

  if (!body.title || !body.url || !body.type || !body.date) {
    throw createError({ statusCode: 400, statusMessage: "title, url, type, date are required" });
  }

  const payload: ResourcePayload = {
    title: body.title,
    url: body.url,
    type: body.type,
    tags: Array.isArray(body.tags) ? body.tags : [],
    date: body.date,
    presenter: body.presenter ?? null,
    relatedMinutesSlug: body.relatedMinutesSlug ?? null,
  };

  const db = getDb(event);
  const existing = await getResourceRow(db, id);
  const resource = await updateResourceItem(db, id, payload);
  if (existing?.file_key) {
    await getResourcesBucket(event).delete(existing.file_key).catch(() => undefined);
  }
  return { resource };
});
