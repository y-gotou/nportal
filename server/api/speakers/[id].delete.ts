import { createError } from "h3";
import { getDb } from "~~/server/utils/survey";
import { deleteSpeakerApplication, parseSpeakerId } from "~~/server/utils/speakers";

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseSpeakerId(event.context.params?.id);
  const db = getDb(event);

  await deleteSpeakerApplication(db, id, user.email);

  return { success: true };
});
