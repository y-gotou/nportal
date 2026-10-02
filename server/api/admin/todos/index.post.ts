import { readBody } from "h3";
import { assertAdmin } from "~~/server/utils/admin";
import { getDb } from "~~/server/utils/db";
import { createTodo, type TodoInput } from "~~/server/utils/todos";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const body = await readBody<TodoInput>(event);
  await createTodo(getDb(event), body ?? {});
  return { success: true };
});
