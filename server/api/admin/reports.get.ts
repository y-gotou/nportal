import { assertAdmin } from "~~/server/utils/admin";
import { listReports } from "~~/server/utils/reports";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  assertAdmin(event);

  const reports = await listReports(getDb(event));
  return { reports };
});
