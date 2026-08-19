import assert from "node:assert/strict";
import test from "node:test";
import {
  reportTypeClass,
  reportTypeLabel,
  speakerStatusClass,
  speakerStatusLabel,
  surveyStatusClass,
} from "../app/utils/status.ts";

test("surveyStatusClass は受付中を青、受付終了をグレーで返す", () => {
  assert.match(surveyStatusClass("active"), /bg-blue-50/);
  assert.match(surveyStatusClass("closed"), /bg-surface-hover/);
});

test("surveyStatusClass の下書きは公開側でグレー、highlightDraft 指定時のみ amber", () => {
  assert.match(surveyStatusClass("draft"), /bg-surface-hover/);
  assert.match(surveyStatusClass("draft", { highlightDraft: true }), /bg-amber-50/);
  // highlightDraft は下書き以外の配色に影響しない
  assert.match(surveyStatusClass("active", { highlightDraft: true }), /bg-blue-50/);
  assert.match(surveyStatusClass("closed", { highlightDraft: true }), /bg-surface-hover/);
});

test("speakerStatusLabel / speakerStatusClass は 3 ステータスを判別する", () => {
  assert.equal(speakerStatusLabel("pending"), "応募中");
  assert.equal(speakerStatusLabel("scheduled"), "発表予定");
  assert.equal(speakerStatusLabel("done"), "発表済み");
  assert.match(speakerStatusClass("pending"), /bg-amber-50/);
  assert.match(speakerStatusClass("scheduled"), /bg-blue-50/);
  assert.match(speakerStatusClass("done"), /bg-green-50/);
});

test("reportTypeLabel / reportTypeClass は不具合と要望を判別する", () => {
  assert.equal(reportTypeLabel("bug"), "不具合");
  assert.equal(reportTypeLabel("request"), "要望");
  assert.match(reportTypeClass("bug"), /bg-rose-50/);
  assert.match(reportTypeClass("request"), /bg-blue-50/);
});
