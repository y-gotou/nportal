import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDisplayDate,
  getTodayDate,
  formatDisplayDateTime,
  portalDescription,
  portalTitle,
} from "../utils/content.ts";

test("getTodayDate formats local dates as YYYY-MM-DD", () => {
  const date = new Date(2026, 3, 13, 9, 30, 0);

  assert.equal(getTodayDate(date), "2026-04-13");
});

test("formatDisplayDate renders Japanese locale dates", () => {
  assert.equal(formatDisplayDate("2026-04-17"), "2026年4月17日");
});

test("content constants expose portal metadata", () => {
  assert.equal(portalTitle, "N Portal");
  assert.match(portalDescription, /社内AI勉強会/);
});

test("formatDisplayDateTime appends time when provided", () => {
  assert.equal(formatDisplayDateTime("2026-04-17", "19:00"), "2026年4月17日 19:00");
  assert.equal(formatDisplayDateTime("2026-04-17"), "2026年4月17日");
});
