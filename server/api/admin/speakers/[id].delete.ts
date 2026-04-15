import { assertAdmin } from "~~/server/utils/admin";
import { getDb } from "~~/server/utils/survey";
import { adminDeleteSpeakerApplication, parseSpeakerId } from "~~/server/utils/speakers";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseSpeakerId(event.context.params?.id);
  const db = getDb(event);

  await adminDeleteSpeakerApplication(db, id);

  return { success: true };
});
