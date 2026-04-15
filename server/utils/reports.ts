import { createError } from "h3";
import type { CreateReportInput, D1DatabaseLike, Report, ReportType } from "../../types/portal.ts";

interface ReportRow {
  id: number;
  report_type: string;
  title: string;
  detail: string;
  user_email: string;
  created_at: string;
}

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    reportType: parseReportType(row.report_type, "Invalid report type in database."),
    title: row.title,
    detail: row.detail,
    userEmail: row.user_email,
    createdAt: row.created_at,
  };
}

export function parseReportType(
  value: unknown,
  message = "Invalid report type.",
): ReportType {
  if (value === "bug" || value === "request") {
    return value;
  }

  throw createError({
    statusCode: 400,
    statusMessage: message,
  });
}

export function parseReportId(value: unknown): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid report ID.",
    });
  }

  return id;
}

export async function listReports(
  db: D1DatabaseLike,
): Promise<Report[]> {
  const { results } = await db
    .prepare(
      `SELECT id, report_type, title, detail, user_email, created_at
       FROM reports
       ORDER BY datetime(created_at) DESC, id DESC`,
    )
    .all<ReportRow>();

  return results.map(toReport);
}

export async function createReport(
  db: D1DatabaseLike,
  data: CreateReportInput,
  userEmail: string,
): Promise<Report> {
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `INSERT INTO reports (report_type, title, detail, user_email, created_at)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, report_type, title, detail, user_email, created_at`,
    )
    .bind(data.reportType, data.title, data.detail, userEmail, now)
    .first<ReportRow>();

  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create report.",
    });
  }

  return toReport(row);
}

export async function deleteReport(
  db: D1DatabaseLike,
  id: number,
): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM reports WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Report not found.",
    });
  }

  await db
    .prepare("DELETE FROM reports WHERE id = ?")
    .bind(id)
    .first();
}
