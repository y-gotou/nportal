import { updateSurveyPublicationStatuses } from "~~/server/utils/survey";
import type { D1DatabaseLike } from "~~/types/portal";

interface CloudflareTaskContext {
  cloudflare?: {
    env?: {
      DB?: D1DatabaseLike;
    };
  };
}

export default defineTask({
  meta: {
    description: "Publish scheduled surveys and close expired surveys.",
  },
  async run(event) {
    const db = (event.context as CloudflareTaskContext).cloudflare?.env?.DB;

    if (!db) {
      throw new Error("Cloudflare D1 binding `DB` is not configured.");
    }

    await updateSurveyPublicationStatuses(db);

    return { result: { success: true } };
  },
});
