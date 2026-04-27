import { getDb } from "~~/server/utils/survey";
import { assertAdmin } from "~~/server/utils/admin";
import { deleteResourceItem, getResourcesBucket, parseResourceId } from "~~/server/utils/resources";

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
