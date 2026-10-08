import { readBody } from "h3";
import { requireUser } from "~~/server/utils/auth";
import { getDb } from "~~/server/utils/db";
import { createTodo, type TodoInput } from "~~/server/utils/todos";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const body = await readBody<TodoInput>(event);
  await createTodo(getDb(event), body ?? {}, user.email);
  return { success: true };
});
