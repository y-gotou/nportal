import { createError, readBody } from "h3";
import { getDb } from "~~/server/utils/db";
import { requireUser } from "~~/server/utils/auth";
import { createReport, parseReportType } from "~~/server/utils/reports";
import type { CreateReportInput } from "~~/types/portal";

interface CreateReportBody {
  reportType?: unknown;
  title?: unknown;
  detail?: unknown;
}

function requireTrimmedString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required.`,
    });
  }

  return value.trim();
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const body = await readBody<CreateReportBody>(event);

  const input: CreateReportInput = {
    reportType: parseReportType(body.reportType),
    title: requireTrimmedString(body.title, "title"),
    detail: requireTrimmedString(body.detail, "detail"),
  };

  const report = await createReport(getDb(event), input, user.email);

  return { report };
});
