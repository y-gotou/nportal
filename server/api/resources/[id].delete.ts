import { createError } from "h3";
import { getDb } from "~~/server/utils/db";
import { getResourcesBucket } from "~~/server/utils/r2";
import {
  deleteResourceItem,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseResourceId(event.context.params?.id);
  const { fileKey, imageKeys } = await deleteResourceItem(getDb(event), id, user);

  const keys = [...(fileKey ? [fileKey] : []), ...imageKeys];
  if (keys.length > 0) {
    const bucket = getResourcesBucket(event);
    await Promise.all(keys.map((key) => bucket.delete(key).catch(() => undefined)));
  }

  return { success: true };
});
