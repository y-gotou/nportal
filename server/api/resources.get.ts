import { getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { getUser } from "~~/server/utils/auth";
import { listResources } from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const minutesSlug = query.minutesSlug ? String(query.minutesSlug) : undefined;
  const user = getUser(event);

  const db = getDb(event);
  const resources = await listResources(db, { minutesSlug, user });
  return { resources };
});
