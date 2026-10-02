import { assertAdmin } from "~~/server/utils/admin";
import { getDb } from "~~/server/utils/db";
import { parsePositiveIntParam } from "~~/server/utils/params";
import { deleteTodo } from "~~/server/utils/todos";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parsePositiveIntParam(event.context.params?.id, "Invalid todo ID.");
  await deleteTodo(getDb(event), id);
  return { success: true };
});
