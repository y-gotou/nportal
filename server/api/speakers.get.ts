import { getDb } from "~~/server/utils/survey";
import { listSpeakerApplications } from "~~/server/utils/speakers";

export default defineEventHandler(async (event) => {
  const db = getDb(event);
  const applications = await listSpeakerApplications(db);
  return { applications };
});
