import { getQuery } from "h3";
import { getDb } from "~~/server/utils/db";
import { listTodos } from "~~/server/utils/todos";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const minutesSlug = query.minutesSlug ? String(query.minutesSlug) : undefined;

  const todos = await listTodos(getDb(event), { minutesSlug });
  return { todos };
});
