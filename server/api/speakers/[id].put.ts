import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/survey";
import { parseSpeakerId, updateSpeakerApplication } from "~~/server/utils/speakers";

interface UpdateSpeakerBody {
  title?: string;
  duration?: number;
  note?: string | null;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user as { email: string } | undefined;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = parseSpeakerId(event.context.params?.id);
  const body = await readBody<UpdateSpeakerBody>(event);

  if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
    throw createError({ statusCode: 400, statusMessage: "title is required." });
  }

  const duration = Number(body.duration);
  if (!Number.isInteger(duration) || duration < 1) {
    throw createError({ statusCode: 400, statusMessage: "duration must be a positive integer." });
  }

  const db = getDb(event);
  const application = await updateSpeakerApplication(
    db,
    id,
    {
      title: body.title.trim(),
      duration,
      note: typeof body.note === "string" ? body.note.trim() || null : null,
    },
    user.email,
  );

  return { application };
});
