import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDisplayDate,
  getMinutes,
  getMinutesList,
  getNextEvent,
  getRecentMinutes,
  getRecentResources,
  getResourcesForMinutes,
  getResources,
  getSchedule,
  getTodayDate,
  splitScheduleByDate,
} from "../utils/content.ts";

test("getTodayDate formats local dates as YYYY-MM-DD", () => {
  const date = new Date(2026, 3, 13, 9, 30, 0);

  assert.equal(getTodayDate(date), "2026-04-13");
});

test("formatDisplayDate renders Japanese locale dates", () => {
  assert.equal(formatDisplayDate("2026-04-17"), "2026年4月17日");
});

test("content utilities return pre-sorted data", () => {
  assert.deepEqual(
    getMinutesList().map((minutes) => minutes.slug),
    [
      "2026-03-27-meeting-10",
      "2026-03-20-meeting-09",
      "2026-03-13-meeting-08",
    ],
  );

  assert.deepEqual(
    getResources().map((resource) => resource.id),
    [4, 2, 3, 1],
  );

  assert.deepEqual(
    getSchedule().map((item) => item.id),
    [1, 2, 3],
  );
});

test("minutes lookup and recent minutes reuse normalized data", () => {
  assert.equal(getMinutes("2026-03-20-meeting-09")?.title, "第9回 AI勉強会 - プロンプトエンジニアリング実践");
  assert.equal(getMinutes("missing-slug"), null);

  assert.deepEqual(
    getRecentMinutes(2).map((minutes) => minutes.slug),
    ["2026-03-27-meeting-10", "2026-03-20-meeting-09"],
  );

  assert.deepEqual(
    getRecentResources(2).map((resource) => resource.id),
    [4, 2],
  );

  assert.deepEqual(
    getResourcesForMinutes("2026-03-13-meeting-08").map((resource) => resource.id),
    [2, 3],
  );
});

test("schedule helpers split upcoming and past events consistently", () => {
  const { upcoming, past } = splitScheduleByDate("2026-04-10");

  assert.deepEqual(
    upcoming.map((item) => item.id),
    [2, 3],
  );

  assert.deepEqual(
    past.map((item) => item.id),
    [1],
  );

  assert.equal(getNextEvent("2026-04-11")?.id, 3);
  assert.equal(getNextEvent("2026-04-18"), null);
});
