import { readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { updateResourceItem, type ResourcePayload } from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = Number(event.context.params?.id);
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid id" });

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
  const resource = await updateResourceItem(db, id, payload);
  return { resource };
});
