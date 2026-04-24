import assert from "node:assert/strict";
import test from "node:test";
import {
  createMinutes,
  getMinutesSlugFromDate,
  updateMinutes,
} from "../server/utils/minutes.ts";
import { listSchedule } from "../server/utils/schedule.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

interface MinutesRow {
  id: number;
  slug: string;
  title: string;
  date: string;
  attendees: string;
  topics: string;
  content_md: string;
  content_html: string;
}

interface ScheduleRow {
  id: number;
  date: string;
  time: string;
  title: string;
  meeting_url: string | null;
  minutes_slug: string | null;
  topics: string;
  location: string | null;
}

interface TestDbState {
  minutes: MinutesRow[];
  schedule: ScheduleRow[];
}

function createDb(state: TestDbState): D1DatabaseLike {
  return {
    prepare(query: string) {
      let boundValues: unknown[] = [];

      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          boundValues = values;
          return this;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes("SELECT * FROM minutes WHERE slug = ?")) {
            return (state.minutes.find((row) => row.slug === boundValues[0]) ?? null) as T | null;
          }

          if (query.includes("SELECT * FROM minutes WHERE date = ?")) {
            return (state.minutes.find((row) => row.date === boundValues[0]) ?? null) as T | null;
          }

          if (query.includes("INSERT INTO minutes")) {
            state.minutes.push({
              id: state.minutes.length + 1,
              slug: String(boundValues[0]),
              title: String(boundValues[1]),
              date: String(boundValues[2]),
              attendees: String(boundValues[3]),
              topics: String(boundValues[4]),
              content_md: String(boundValues[5]),
              content_html: String(boundValues[6]),
            });
            return null;
          }

          if (query.includes("UPDATE minutes")) {
            const slug = String(boundValues[5]);
            const row = state.minutes.find((item) => item.slug === slug);
            if (row) {
              row.title = String(boundValues[0]);
              row.attendees = String(boundValues[1]);
              row.topics = String(boundValues[2]);
              row.content_md = String(boundValues[3]);
              row.content_html = String(boundValues[4]);
            }
            return null;
          }

          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (query.includes("SELECT schedule.*")) {
            return {
              results: state.schedule
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((row) => ({
                  ...row,
                  resolved_minutes_slug:
                    state.minutes.find((minutes) => minutes.date === row.date)?.slug ?? null,
                })) as T[],
            };
          }

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

test("getMinutesSlugFromDate uses YYYY-MM-DD dates as slugs", () => {
  assert.equal(getMinutesSlugFromDate("2026-04-23"), "2026-04-23");
  assert.throws(() => getMinutesSlugFromDate("2026-4-23"), /date must be YYYY-MM-DD/);
});

test("createMinutes derives slug from date and rejects duplicates", async () => {
  const state: TestDbState = { minutes: [], schedule: [] };
  const db = createDb(state);

  const created = await createMinutes(db, {
    title: "第1回 社内AI勉強会",
    date: "2026-04-23",
    attendees: ["田中"],
    topics: ["ChatGPT"],
    contentMd: "## 議題",
  });

  assert.equal(created.slug, "2026-04-23");
  assert.equal(state.minutes[0].slug, "2026-04-23");

  await assert.rejects(
    () =>
      createMinutes(db, {
        title: "重複",
        date: "2026-04-23",
        attendees: [],
        topics: [],
        contentMd: "",
      }),
    /Minutes already exists for this date/,
  );
});

test("updateMinutes rejects date changes", async () => {
  const db = createDb({
    minutes: [
      {
        id: 1,
        slug: "2026-04-23",
        title: "第1回 社内AI勉強会",
        date: "2026-04-23",
        attendees: "[]",
        topics: "[]",
        content_md: "",
        content_html: "",
      },
    ],
    schedule: [],
  });

  await assert.rejects(
    () =>
      updateMinutes(db, "2026-04-23", {
        title: "第1回 社内AI勉強会",
        date: "2026-04-24",
        attendees: [],
        topics: [],
        contentMd: "",
      }),
    /Minutes date cannot be changed/,
  );
});

test("listSchedule derives minutesSlug from minutes with the same date", async () => {
  const db = createDb({
    minutes: [
      {
        id: 1,
        slug: "2026-04-23",
        title: "議事録",
        date: "2026-04-23",
        attendees: "[]",
        topics: "[]",
        content_md: "",
        content_html: "",
      },
    ],
    schedule: [
      {
        id: 1,
        date: "2026-04-24",
        time: "19:00",
        title: "次回",
        meeting_url: null,
        minutes_slug: "stale-slug",
        topics: "[]",
        location: null,
      },
      {
        id: 2,
        date: "2026-04-23",
        time: "19:00",
        title: "開催済み",
        meeting_url: null,
        minutes_slug: null,
        topics: "[]",
        location: null,
      },
    ],
  });

  const schedule = await listSchedule(db);

  assert.deepEqual(
    schedule.map((item) => [item.date, item.minutesSlug]),
    [
      ["2026-04-23", "2026-04-23"],
      ["2026-04-24", null],
    ],
  );
});
