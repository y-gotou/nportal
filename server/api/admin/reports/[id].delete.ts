import { assertAdmin } from "~~/server/utils/admin";
import { deleteReport, parseReportId } from "~~/server/utils/reports";
import { getDb } from "~~/server/utils/survey";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const id = parseReportId(event.context.params?.id);
  await deleteReport(getDb(event), id);

  return { success: true };
});
