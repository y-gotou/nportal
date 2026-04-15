import assert from "node:assert/strict";
import test from "node:test";
import { createError } from "h3";
import { createReport, deleteReport, listReports, parseReportId, parseReportType } from "../server/utils/reports.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

function createDb(): D1DatabaseLike {
  const reports = [
    {
      id: 2,
      report_type: "request",
      title: "資料一覧に絞り込みを追加したい",
      detail: "タグで絞り込めるようにしてほしいです。",
      user_email: "member2@example.com",
      created_at: "2026-04-11T09:30:00.000Z",
    },
    {
      id: 1,
      report_type: "bug",
      title: "議事録画面でレイアウトが崩れる",
      detail: "モバイル表示で横スクロールします。",
      user_email: "member1@example.com",
      created_at: "2026-04-10T09:30:00.000Z",
    },
  ];

  return {
    prepare(query: string): D1PreparedStatement {
      let boundValues: unknown[] = [];

      return {
        bind(...values: unknown[]) {
          boundValues = values;
          return this;
        },
        async first() {
          if (query.includes("INSERT INTO reports")) {
            return {
              id: 3,
              report_type: boundValues[0],
              title: boundValues[1],
              detail: boundValues[2],
              user_email: boundValues[3],
              created_at: boundValues[4],
            };
          }

          if (query === "SELECT id FROM reports WHERE id = ?") {
            const reportId = Number(boundValues[0]);
            return reports.find((report) => report.id === reportId)
              ? { id: reportId }
              : null;
          }

          if (query === "DELETE FROM reports WHERE id = ?") {
            const reportId = Number(boundValues[0]);
            const index = reports.findIndex((report) => report.id === reportId);
            if (index >= 0) {
              reports.splice(index, 1);
            }
            return null;
          }

          return null;
        },
        async all() {
          if (query.includes("FROM reports")) {
            return { results: reports };
          }

          return { results: [] };
        },
      };
    },
    async batch() {
      return [];
    },
  };
}

test("report helpers validate type and id", () => {
  assert.equal(parseReportType("bug"), "bug");
  assert.equal(parseReportType("request"), "request");
  assert.equal(parseReportId("12"), 12);

  assert.throws(
    () => parseReportType("other"),
    (error: unknown) => error instanceof Error && error.message === "Invalid report type.",
  );
  assert.throws(
    () => parseReportId("0"),
    (error: unknown) => error instanceof Error && error.message === "Invalid report ID.",
  );
});

test("listReports returns mapped reports in descending order", async () => {
  const reports = await listReports(createDb());

  assert.equal(reports.length, 2);
  assert.equal(reports[0]?.reportType, "request");
  assert.equal(reports[0]?.userEmail, "member2@example.com");
  assert.equal(reports[1]?.reportType, "bug");
});

test("createReport stores a new report with the authenticated email", async () => {
  const db = createDb();
  const report = await createReport(
    db,
    {
      reportType: "bug",
      title: "アンケート送信後にエラーが出る",
      detail: "回答完了後に再読み込みすると 500 になります。",
    },
    "author@example.com",
  );

  assert.equal(report.reportType, "bug");
  assert.equal(report.title, "アンケート送信後にエラーが出る");
  assert.equal(report.userEmail, "author@example.com");
});

test("deleteReport removes existing reports and rejects unknown ids", async () => {
  const db = createDb();

  await deleteReport(db, 1);
  const reports = await listReports(db);
  assert.deepEqual(reports.map((report) => report.id), [2]);

  await assert.rejects(
    () => deleteReport(db, 999),
    (error: unknown) =>
      error instanceof Error &&
      "statusCode" in error &&
      (error as ReturnType<typeof createError>).statusCode === 404,
  );
});
