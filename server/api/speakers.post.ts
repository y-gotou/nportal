import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import {
  createSpeakerApplication,
  parseSpeakerApplicationBody,
  type SpeakerApplicationBody,
} from "~~/server/utils/speakers";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const data = parseSpeakerApplicationBody(await readBody<SpeakerApplicationBody>(event));

  const db = getDb(event);
  const application = await createSpeakerApplication(db, data, user.email);

  return { application };
});
