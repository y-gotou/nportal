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
      // dev では cloudflare bindings が tasks に渡らないため no-op で抜ける。
      // 本番 (Cloudflare cron trigger) では env.DB が解決される。
      console.warn(
        "[surveys:update-status] D1 binding `DB` is not available; skipping.",
      );
      return { result: { success: true } };
    }

    await updateSurveyPublicationStatuses(db);

    return { result: { success: true } };
  },
});
