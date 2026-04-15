import { readBody } from "h3";
import { assertAdmin } from "~~/server/utils/admin";
import { getDb } from "~~/server/utils/survey";
import { adminUpdateSpeakerStatus, parseSpeakerId } from "~~/server/utils/speakers";
import type { SpeakerApplicationStatus } from "~~/types/portal";

interface AdminUpdateBody {
  status?: string;
}

const VALID_STATUSES: SpeakerApplicationStatus[] = ["pending", "scheduled", "done"];

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseSpeakerId(event.context.params?.id);
  const body = await readBody<AdminUpdateBody>(event);

  if (!body.status || !VALID_STATUSES.includes(body.status as SpeakerApplicationStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: `status must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const db = getDb(event);
  const application = await adminUpdateSpeakerStatus(db, id, body.status as SpeakerApplicationStatus);

  return { application };
});
