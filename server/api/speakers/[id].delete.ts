import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { deleteSpeakerApplication, parseSpeakerId } from "~~/server/utils/speakers";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parseSpeakerId(event.context.params?.id);
  const db = getDb(event);

  await deleteSpeakerApplication(db, id, user.email);

  return { success: true };
});
