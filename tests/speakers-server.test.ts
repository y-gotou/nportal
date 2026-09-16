import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { adminUpdateSpeakerApplication, listSpeakerApplications } from "../server/utils/speakers.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

interface SpeakerRow {
  id: number;
  user_email: string;
  title: string;
  duration: number;
  note: string | null;
  status: string;
  minutes_slug: string | null;
  created_at: string;
  updated_at: string;
}

function makeRow(overrides: Partial<SpeakerRow> = {}): SpeakerRow {
  return {
    id: 1,
    user_email: "user@example.com",
    title: "Jujutsu 入門",
    duration: 15,
    note: null,
    status: "scheduled",
    minutes_slug: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

// UPDATE ... SET <動的カラム> WHERE id = ? RETURNING * をエミュレートする
function createDb(rows: SpeakerRow[]): D1DatabaseLike {
  return {
    prepare(query: string) {
      let boundValues: unknown[] = [];

      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          boundValues = values;
          return this;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes("UPDATE speaker_applications")) {
            const setClause = query.match(/SET ([\s\S]+?)\s+WHERE/)?.[1] ?? "";
            const columns = setClause.split(",").map((part) => part.trim().split(" ")[0]!);
            const id = boundValues[boundValues.length - 1];
            const row = rows.find((item) => item.id === id);
            if (!row) return null;
            columns.forEach((column, index) => {
              (row as unknown as Record<string, unknown>)[column] = boundValues[index];
            });
            return { ...row } as T;
          }
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          return { results: [] };
        },
      };

      return stmt;
    },
    async batch() {
      return [];
    },
  };
}

test("adminUpdateSpeakerApplication updates status only", async () => {
  const rows = [makeRow()];
  const updated = await adminUpdateSpeakerApplication(createDb(rows), 1, { status: "done" });

  assert.equal(updated.status, "done");
  assert.equal(updated.minutes_slug, null);
  assert.equal(rows[0]!.status, "done");
});

test("adminUpdateSpeakerApplication sets and clears minutes_slug", async () => {
  const rows = [makeRow()];
  const db = createDb(rows);

  const linked = await adminUpdateSpeakerApplication(db, 1, { minutesSlug: "2026-08-13" });
  assert.equal(linked.minutes_slug, "2026-08-13");
  assert.equal(linked.status, "scheduled");

  const cleared = await adminUpdateSpeakerApplication(db, 1, { minutesSlug: null });
  assert.equal(cleared.minutes_slug, null);
});

test("adminUpdateSpeakerApplication updates status and minutes_slug together", async () => {
  const rows = [makeRow()];
  const updated = await adminUpdateSpeakerApplication(createDb(rows), 1, {
    status: "done",
    minutesSlug: "2026-08-13",
  });

  assert.equal(updated.status, "done");
  assert.equal(updated.minutes_slug, "2026-08-13");
});

test("adminUpdateSpeakerApplication rejects invalid minutes_slug format", async () => {
  await assert.rejects(
    () => adminUpdateSpeakerApplication(createDb([makeRow()]), 1, { minutesSlug: "8月13日" }),
    /minutes_slug must be YYYY-MM-DD or null/,
  );
});

test("adminUpdateSpeakerApplication rejects empty updates", async () => {
  await assert.rejects(
    () => adminUpdateSpeakerApplication(createDb([makeRow()]), 1, {}),
    /No fields to update/,
  );
});

test("adminUpdateSpeakerApplication rejects unknown application", async () => {
  await assert.rejects(
    () => adminUpdateSpeakerApplication(createDb([]), 99, { status: "done" }),
    /Application not found/,
  );
});

// 並び順は SQL の ORDER BY が決めるため、スタブではなく実 SQLite で検証する
function createSqliteDb(rows: SpeakerRow[]): D1DatabaseLike {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE speaker_applications (
    id INTEGER PRIMARY KEY,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL,
    note TEXT,
    status TEXT NOT NULL,
    minutes_slug TEXT,
    resource_id INTEGER,
    created_at TEXT,
    updated_at TEXT
  )`);

  const insert = sqlite.prepare(
    `INSERT INTO speaker_applications
       (id, user_email, title, duration, note, status, minutes_slug, resource_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  );
  for (const row of rows) {
    insert.run(
      row.id,
      row.user_email,
      row.title,
      row.duration,
      row.note,
      row.status,
      row.minutes_slug,
      row.created_at,
      row.updated_at,
    );
  }

  return {
    prepare(query: string) {
      const statement = sqlite.prepare(query);
      let boundValues: unknown[] = [];

      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          boundValues = values;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          return (statement.get(...(boundValues as never[])) as T) ?? null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          return { results: statement.all(...(boundValues as never[])) as T[] };
        },
      };

      return stmt;
    },
    async batch() {
      return [];
    },
  };
}

test("listSpeakerApplications orders pending and scheduled oldest first, done newest first", async () => {
  const db = createSqliteDb([
    makeRow({ id: 1, status: "pending", created_at: "2026-08-03T00:00:00.000Z" }),
    makeRow({ id: 2, status: "pending", created_at: "2026-08-01T00:00:00.000Z" }),
    makeRow({ id: 3, status: "scheduled", created_at: "2026-08-05T00:00:00.000Z" }),
    makeRow({ id: 4, status: "scheduled", created_at: "2026-08-02T00:00:00.000Z" }),
    makeRow({ id: 5, status: "done", created_at: "2026-08-04T00:00:00.000Z" }),
    makeRow({ id: 6, status: "done", created_at: "2026-08-06T00:00:00.000Z" }),
  ]);

  const applications = await listSpeakerApplications(db);

  assert.deepEqual(
    applications.map((application) => application.id),
    [2, 1, 4, 3, 6, 5],
  );
});

test("listSpeakerApplications orders mixed created_at formats by actual time", async () => {
  const db = createSqliteDb([
    // datetime('now') 形式と ISO 8601 形式が同一日付で混在する
    makeRow({ id: 1, status: "pending", created_at: "2026-08-27 05:00:00" }),
    makeRow({ id: 2, status: "pending", created_at: "2026-08-27T04:58:51.143Z" }),
    makeRow({ id: 3, status: "done", created_at: "2026-08-27 05:00:00" }),
    makeRow({ id: 4, status: "done", created_at: "2026-08-27T04:58:51.143Z" }),
    // 同時刻の行は id で安定させる
    makeRow({ id: 5, status: "scheduled", created_at: "2026-08-27T06:00:00.000Z" }),
    makeRow({ id: 6, status: "scheduled", created_at: "2026-08-27T06:00:00.000Z" }),
  ]);

  const applications = await listSpeakerApplications(db);

  assert.deepEqual(
    applications.map((application) => application.id),
    [2, 1, 5, 6, 3, 4],
  );
});
