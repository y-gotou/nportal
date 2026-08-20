import assert from "node:assert/strict";
import test from "node:test";
import { isSpeakerFormDirty, type SpeakerFormValues } from "../app/utils/speakers.ts";

const createInitial: SpeakerFormValues = { title: "", duration: 15, note: "" };
const editInitial: SpeakerFormValues = { title: "LLM入門", duration: 30, note: "前半のみ" };

test("初期値と同一なら dirty ではない(新規)", () => {
  assert.equal(isSpeakerFormDirty({ ...createInitial }, createInitial), false);
});

test("初期値と同一なら dirty ではない(編集)", () => {
  assert.equal(isSpeakerFormDirty({ ...editInitial }, editInitial), false);
});

test("タイトルの変更で dirty になる", () => {
  assert.equal(isSpeakerFormDirty({ ...createInitial, title: "a" }, createInitial), true);
});

test("発表時間の変更で dirty になる", () => {
  assert.equal(isSpeakerFormDirty({ ...createInitial, duration: 20 }, createInitial), true);
});

test("発表時間を空欄にすると dirty になる", () => {
  assert.equal(isSpeakerFormDirty({ ...createInitial, duration: "" }, createInitial), true);
});

test("備考の変更で dirty になる", () => {
  assert.equal(isSpeakerFormDirty({ ...editInitial, note: "" }, editInitial), true);
});

test("変更後に手動で初期値へ戻すと dirty ではない", () => {
  const current = { ...editInitial, title: "変更後" };
  current.title = editInitial.title;
  assert.equal(isSpeakerFormDirty(current, editInitial), false);
});
