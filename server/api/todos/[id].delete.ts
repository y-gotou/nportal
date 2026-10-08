import { requireUser } from "~~/server/utils/auth";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { deleteTodo } from "~~/server/utils/todos";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid todo ID.");
  await deleteTodo(getDb(event), id, user);
  return { success: true };
});
