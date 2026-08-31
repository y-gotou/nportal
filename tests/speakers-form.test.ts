import assert from "node:assert/strict";
import test from "node:test";
import {
  isSpeakerFormDirty,
  selectableResourcesForApplication,
  type SpeakerFormValues,
} from "../app/utils/speakers.ts";
import { resourceOpensInNewTab } from "../app/utils/resources.ts";
import type { ResourceItem } from "../types/portal.ts";

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

function makeResource(overrides: Partial<ResourceItem> = {}): ResourceItem {
  return {
    id: 1,
    title: "資料",
    url: "/api/resources/1/file",
    type: "PDF",
    tags: [],
    date: "2026-08-20",
    presenter: null,
    sourceType: "file",
    submittedBy: "user@example.com",
    linkedApplication: null,
    ...overrides,
  };
}

test("紐付け候補は本人が投稿し、他の応募に紐付いていない資料に限る", () => {
  const resources = [
    makeResource({ id: 1 }),
    makeResource({ id: 2, submittedBy: "other@example.com" }),
    makeResource({ id: 3, linkedApplication: { id: 99, title: "別の発表" } }),
    makeResource({ id: 4, linkedApplication: { id: 10, title: "この発表" } }),
  ];

  const selectable = selectableResourcesForApplication(resources, 10, "user@example.com");

  assert.deepEqual(selectable.map((resource) => resource.id), [1, 4]);
});

test("紐付け候補は未ログイン相当のメール不一致では空になる", () => {
  const resources = [makeResource({ id: 1 })];

  assert.deepEqual(selectableResourcesForApplication(resources, 10, "nobody@example.com"), []);
});

test("ファイル資料の直接リンクのみ新規タブで開く", () => {
  assert.equal(resourceOpensInNewTab(makeResource()), true);
  assert.equal(
    resourceOpensInNewTab(makeResource({ url: "/resources/1", fileName: "notes.md" })),
    false,
  );
  assert.equal(
    resourceOpensInNewTab(makeResource({ sourceType: "url", url: "https://example.com" })),
    false,
  );
});
