import { getDb } from "~~/server/utils/db";
import { assertAdmin } from "~~/server/utils/admin";
import { getResourcesBucket } from "~~/server/utils/r2";
import { deleteResourceItem, parseResourceId } from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseResourceId(event.context.params?.id);

  const db = getDb(event);
  const { fileKey } = await deleteResourceItem(db, id);
  if (fileKey) {
    await getResourcesBucket(event).delete(fileKey).catch(() => undefined);
  }
  return { success: true };
});
