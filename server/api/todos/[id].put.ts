import { readBody } from "h3";
import { requireUser } from "~~/server/utils/auth";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { updateTodo, type TodoInput } from "~~/server/utils/todos";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid todo ID.");
  const body = await readBody<TodoInput>(event);
  await updateTodo(getDb(event), id, body ?? {}, user);
  return { success: true };
});
