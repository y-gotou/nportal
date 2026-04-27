import { getQuery } from "h3";
import { getDb } from "~~/server/utils/survey";
import { listResources } from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const minutesSlug = query.minutesSlug ? String(query.minutesSlug) : undefined;
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;

  const db = getDb(event);
  const resources = await listResources(db, { minutesSlug, user });
  return { resources };
});
