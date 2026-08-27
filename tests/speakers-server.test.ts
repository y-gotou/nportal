import assert from "node:assert/strict";
import test from "node:test";
import { adminUpdateSpeakerApplication } from "../server/utils/speakers.ts";
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
