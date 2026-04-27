import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import {
  deleteResourceItem,
  getResourcesBucket,
  parseResourceId,
} from "~~/server/utils/resources";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string; isAdmin?: boolean } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseResourceId(event.context.params?.id);
  const { fileKey } = await deleteResourceItem(getDb(event), id, user);

  if (fileKey) {
    await getResourcesBucket(event).delete(fileKey).catch(() => undefined);
  }

  return { success: true };
});
