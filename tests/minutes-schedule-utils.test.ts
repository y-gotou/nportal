import assert from "node:assert/strict";
import test from "node:test";
import {
  createMinutes,
  escapeLikePattern,
  getMinutesDetail,
  getMinutesSlugFromDate,
  listMinutes,
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
  chatMessages?: Array<{ schedule_id: number }>;
}

// SQLite の LIKE(ESCAPE '\')を正規表現でエミュレートする(大文字小文字非区別)
function likeToRegExp(pattern: string): RegExp {
  let regex = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!;
    if (char === "\\") {
      i += 1;
      regex += (pattern[i] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else if (char === "%") {
      regex += "[\\s\\S]*";
    } else if (char === "_") {
      regex += "[\\s\\S]";
    } else {
      regex += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${regex}$`, "i");
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
          if (query.includes("LEFT JOIN schedule ON schedule.date = minutes.date")) {
            const row = state.minutes.find((item) => item.slug === boundValues[0]);
            if (!row) return null;
            const schedule = state.schedule.find((item) => item.date === row.date);
            const hasChat = schedule
              ? (state.chatMessages ?? []).some((m) => m.schedule_id === schedule.id)
              : false;
            return {
              ...row,
              schedule_id: schedule?.id ?? null,
              has_chat: hasChat ? 1 : 0,
            } as T;
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

          if (query.includes("WHERE title LIKE ?")) {
            const matcher = likeToRegExp(String(boundValues[0]));
            return {
              results: state.minutes
                .filter(
                  (row) =>
                    matcher.test(row.title) ||
                    matcher.test(row.topics) ||
                    matcher.test(row.content_md),
                )
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date)) as T[],
            };
          }

          if (query.includes("FROM minutes ORDER BY date DESC")) {
            return {
              results: state.minutes
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date)) as T[],
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

test("getMinutesDetail resolves scheduleId and hasChat from schedule with the same date", async () => {
  const minutesRow = {
    id: 1,
    slug: "2026-04-23",
    title: "議事録",
    date: "2026-04-23",
    attendees: "[]",
    topics: "[]",
    content_md: "",
    content_html: "",
  };
  const scheduleRow = {
    id: 5,
    date: "2026-04-23",
    time: "19:00",
    title: "開催済み",
    meeting_url: null,
    minutes_slug: null,
    topics: "[]",
    location: null,
  };

  const withChat = await getMinutesDetail(
    createDb({
      minutes: [minutesRow],
      schedule: [scheduleRow],
      chatMessages: [{ schedule_id: 5 }],
    }),
    "2026-04-23",
  );
  assert.equal(withChat?.scheduleId, 5);
  assert.equal(withChat?.hasChat, true);

  const withoutChat = await getMinutesDetail(
    createDb({ minutes: [minutesRow], schedule: [scheduleRow] }),
    "2026-04-23",
  );
  assert.equal(withoutChat?.scheduleId, 5);
  assert.equal(withoutChat?.hasChat, false);

  const withoutSchedule = await getMinutesDetail(
    createDb({ minutes: [minutesRow], schedule: [] }),
    "2026-04-23",
  );
  assert.equal(withoutSchedule?.scheduleId, null);
  assert.equal(withoutSchedule?.hasChat, false);
});

function searchTestState(): TestDbState {
  return {
    minutes: [
      {
        id: 1,
        slug: "2026-08-13",
        title: "第29回 社内AI勉強会",
        date: "2026-08-13",
        attendees: '["本川"]',
        topics: '["バージョン管理"]',
        content_md: "## Jujutsu の紹介\n本川さんが Jujutsu について発表。",
        content_html: "",
      },
      {
        id: 2,
        slug: "2026-08-20",
        title: "第30回 社内AI勉強会",
        date: "2026-08-20",
        attendees: "[]",
        topics: '["ChatGPT"]',
        content_md: "進捗は50%達成。",
        content_html: "",
      },
    ],
    schedule: [],
  };
}

test("listMinutes without keyword returns all minutes in date-descending order", async () => {
  const minutes = await listMinutes(createDb(searchTestState()));
  assert.deepEqual(
    minutes.map((item) => item.slug),
    ["2026-08-20", "2026-08-13"],
  );
});

test("listMinutes matches keyword against content_md, title, and topics", async () => {
  const db = createDb(searchTestState());

  // 本文のみに含まれる語
  assert.deepEqual(
    (await listMinutes(db, "Jujutsu")).map((item) => item.slug),
    ["2026-08-13"],
  );
  // タイトルに含まれる語
  assert.deepEqual(
    (await listMinutes(db, "第30回")).map((item) => item.slug),
    ["2026-08-20"],
  );
  // トピックに含まれる語
  assert.deepEqual(
    (await listMinutes(db, "バージョン管理")).map((item) => item.slug),
    ["2026-08-13"],
  );
});

test("listMinutes ignores ASCII letter case and returns empty for no match", async () => {
  const db = createDb(searchTestState());

  assert.deepEqual(
    (await listMinutes(db, "jujutsu")).map((item) => item.slug),
    ["2026-08-13"],
  );
  assert.deepEqual(await listMinutes(db, "存在しない語"), []);
});

test("listMinutes escapes LIKE wildcards in the keyword", async () => {
  const db = createDb(searchTestState());

  // "50%" は本文のリテラル一致のみ(% がワイルドカード扱いなら両件一致してしまう)
  assert.deepEqual(
    (await listMinutes(db, "50%")).map((item) => item.slug),
    ["2026-08-20"],
  );
  assert.equal(escapeLikePattern("100%_\\"), "100\\%\\_\\\\");
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
