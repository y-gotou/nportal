import assert from "node:assert/strict";
import test from "node:test";
import {
  DATE_PATTERN,
  addUtcDays,
  jstToday,
  parseD1Timestamp,
  parseDateOnly,
} from "../shared/utils/date.ts";
import { parseStringArray } from "../shared/utils/json.ts";

test("DATE_PATTERN は YYYY-MM-DD のみ受け入れる", () => {
  assert.equal(DATE_PATTERN.test("2026-08-19"), true);
  assert.equal(DATE_PATTERN.test("2026/08/19"), false);
  assert.equal(DATE_PATTERN.test("2026-8-19"), false);
});

test("jstToday は UTC の時刻から JST の日付を返す", () => {
  // UTC 2026-08-18 20:00 = JST 2026-08-19 05:00
  assert.equal(jstToday(Date.UTC(2026, 7, 18, 20, 0, 0)), "2026-08-19");
  assert.equal(jstToday(Date.UTC(2026, 7, 18, 10, 0, 0)), "2026-08-18");
});

test("addUtcDays は月境界をまたいで日付をずらす", () => {
  assert.equal(addUtcDays("2026-08-19", -7), "2026-08-12");
  assert.equal(addUtcDays("2026-08-01", -1), "2026-07-31");
  assert.equal(addUtcDays("2026-12-31", 1), "2027-01-01");
});

test("parseD1Timestamp は D1 の UTC 文字列を Date にする", () => {
  const date = parseD1Timestamp("2026-08-19 03:00:00");
  assert.equal(date.toISOString(), "2026-08-19T03:00:00.000Z");
});

test("parseDateOnly はローカルの 0 時として解釈する", () => {
  const date = parseDateOnly("2026-08-19");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 7);
  assert.equal(date.getDate(), 19);
  assert.equal(date.getHours(), 0);
});

test("parseStringArray は文字列配列のみ受け入れる", () => {
  assert.deepEqual(parseStringArray('["a","b"]'), ["a", "b"]);
  assert.deepEqual(parseStringArray('["a",1,null]'), ["a"]);
  assert.deepEqual(parseStringArray("{}"), []);
  assert.deepEqual(parseStringArray("broken"), []);
  assert.deepEqual(parseStringArray(null), []);
  assert.deepEqual(parseStringArray(undefined), []);
});
