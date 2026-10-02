import assert from "node:assert/strict";
import test from "node:test";
import { matchesResourceFilters, resourceTypeIcon } from "../app/utils/resources.ts";
import { RESOURCE_TYPE_BY_EXTENSION, inferResourceType } from "../server/utils/upload.ts";
import type { ResourceItem } from "../types/portal.ts";

function resource(overrides: Partial<ResourceItem> = {}): ResourceItem {
  return {
    id: 1,
    title: "社内 LLM の活用事例",
    url: "/api/resources/1/file",
    type: "PDF",
    tags: ["LLM", "事例"],
    date: "2026-09-24",
    presenter: "Yamada",
    sourceType: "file",
    fileName: "usecases.pdf",
    submittedBy: "sato@example.com",
    ...overrides,
  };
}

const noFilter = { keyword: "", type: null, tag: null, mineOnly: false, userEmail: "sato@example.com" };

test("matchesResourceFilters は条件が無ければすべての資料を通す", () => {
  assert.equal(matchesResourceFilters(resource(), noFilter), true);
  assert.equal(matchesResourceFilters(resource({ submittedBy: null }), { ...noFilter, userEmail: null }), true);
});

test("matchesResourceFilters は種類・タグ・キーワードで絞り込む", () => {
  assert.equal(matchesResourceFilters(resource(), { ...noFilter, type: "PDF" }), true);
  assert.equal(matchesResourceFilters(resource(), { ...noFilter, type: "URL" }), false);
  assert.equal(matchesResourceFilters(resource(), { ...noFilter, tag: "事例" }), true);
  assert.equal(matchesResourceFilters(resource(), { ...noFilter, tag: "ChatGPT" }), false);

  // 表示しない項目(ファイル名・発表者)も検索対象に残す
  for (const keyword of ["llm の活用", "事例", "SATO@", "yamada", "usecases.pdf", "  LLM  "]) {
    assert.equal(matchesResourceFilters(resource(), { ...noFilter, keyword }), true, keyword);
  }
  assert.equal(matchesResourceFilters(resource(), { ...noFilter, keyword: "該当なし" }), false);
});

test("matchesResourceFilters の自分の投稿は投稿者が利用者と一致する資料だけを通す", () => {
  const mine = { ...noFilter, mineOnly: true };

  assert.equal(matchesResourceFilters(resource(), mine), true);
  assert.equal(matchesResourceFilters(resource({ submittedBy: "suzuki@example.com" }), mine), false);
  assert.equal(matchesResourceFilters(resource({ submittedBy: null }), mine), false);
  // 利用者が不明なときに、投稿者が未設定の資料を自分の投稿として通さない
  assert.equal(matchesResourceFilters(resource({ submittedBy: null }), { ...mine, userEmail: null }), false);
  assert.equal(matchesResourceFilters(resource(), { ...mine, type: "URL" }), false);
});

test("resourceTypeIcon は投稿時に決まる種類のすべてに専用のアイコンを返す", () => {
  const fallback = resourceTypeIcon("File");
  const types = new Set([...Object.values(RESOURCE_TYPE_BY_EXTENSION), inferResourceType({ url: "https://example.com" })]);

  for (const type of types) {
    assert.notEqual(resourceTypeIcon(type), fallback, type);
  }
  assert.equal(new Set([...types].map((type) => resourceTypeIcon(type).icon)).size, types.size);
});

test("resourceTypeIcon は対応の無い種類を File と同じ表示にする", () => {
  const fallback = resourceTypeIcon("File");

  assert.equal(resourceTypeIcon("スライド"), fallback);
  assert.equal(resourceTypeIcon(inferResourceType({ fileName: "data.unknown" })), fallback);
  assert.equal(resourceTypeIcon("constructor"), fallback);
});
