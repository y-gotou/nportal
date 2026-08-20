import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { getResourcesBucket } from "~~/server/utils/r2";
import {
  deleteResourceItem,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parseResourceId(event.context.params?.id);
  const { fileKey, imageKeys } = await deleteResourceItem(getDb(event), id, user);

  const keys = [...(fileKey ? [fileKey] : []), ...imageKeys];
  if (keys.length > 0) {
    const bucket = getResourcesBucket(event);
    await Promise.all(keys.map((key) => bucket.delete(key).catch(() => undefined)));
  }

  return { success: true };
});
