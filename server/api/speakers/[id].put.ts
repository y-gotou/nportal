import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import {
  parseSpeakerApplicationBody,
  parseSpeakerId,
  updateSpeakerApplication,
  type SpeakerApplicationBody,
} from "~~/server/utils/speakers";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parseSpeakerId(event.context.params?.id);
  const data = parseSpeakerApplicationBody(await readBody<SpeakerApplicationBody>(event));

  const db = getDb(event);
  const application = await updateSpeakerApplication(db, id, data, user.email);

  return { application };
});
