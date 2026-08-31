import { readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import {
  parseResourceIdInput,
  parseSpeakerId,
  setSpeakerApplicationResource,
} from "~~/server/utils/speakers";

interface ResourceLinkBody {
  resource_id?: number | string | null;
}

// 資料の紐付けは発表済み(done)の応募でも本人が行える。編集ガードのある PUT /api/speakers/[id] とは分離する
export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const id = parseSpeakerId(event.context.params?.id);
  const body = await readBody<ResourceLinkBody>(event);
  const resourceId = parseResourceIdInput(body.resource_id ?? null);

  const db = getDb(event);
  const application = await setSpeakerApplicationResource(db, id, resourceId, user.email);

  return { application };
});
