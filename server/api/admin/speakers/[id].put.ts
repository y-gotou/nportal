import { readBody } from "h3";
import { assertAdmin } from "~~/server/utils/admin";
import { getDb } from "~~/server/utils/db";
import {
  adminUpdateSpeakerApplication,
  parseSpeakerId,
  type AdminSpeakerUpdates,
} from "~~/server/utils/speakers";
import type { SpeakerApplicationStatus } from "~~/types/portal";

interface AdminUpdateBody {
  status?: string;
  minutes_slug?: string | null;
}

const VALID_STATUSES: SpeakerApplicationStatus[] = ["pending", "scheduled", "done"];

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseSpeakerId(event.context.params?.id);
  const body = await readBody<AdminUpdateBody>(event);

  const updates: AdminSpeakerUpdates = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as SpeakerApplicationStatus)) {
      throw createError({
        statusCode: 400,
        statusMessage: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
    updates.status = body.status as SpeakerApplicationStatus;
  }

  if ("minutes_slug" in body) {
    updates.minutesSlug = body.minutes_slug ?? null;
  }

  const db = getDb(event);
  const application = await adminUpdateSpeakerApplication(db, id, updates);

  return { application };
});
