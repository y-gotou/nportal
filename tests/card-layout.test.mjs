import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../app/${path}`, import.meta.url), "utf8");

// 右寄せのボタン群は、後続のボタンの有無で先頭のボタンの位置が変わる。
// 横並びになる幅から並びを反転し、先頭のボタンを常に右端に置く
test("card action groups reverse their order once they sit beside the content", async () => {
  const expected = [
    ["pages/index.vue", /sm:flex-row-reverse/g, 2],
    ["pages/survey/index.vue", /sm:flex-row-reverse/g, 1],
    ["pages/speakers.vue", /sm:flex-row-reverse/g, 1],
    ["pages/schedule/index.vue", /lg:flex-row-reverse/g, 2],
  ];

  for (const [path, pattern, count] of expected) {
    assert.equal((await readSource(path)).match(pattern)?.length ?? 0, count, path);
  }
});

test("speakers page follows the shared header and button styles", async () => {
  const page = await readSource("pages/speakers.vue");

  assert.match(page, /<SectionHeader title="発表募集">\s*<template #action>/);
  assert.match(page, /:class="secondaryButtonClass"\s+@click="openEditForm\(app\)"/);
  assert.match(page, /:class="dangerButtonClass"\s+@click="withdrawApplication\(app\.id\)"/);
  assert.doesNotMatch(page, /<span class="text-border">\|<\/span>/);
});

test("resources page hides the tag row without tags", async () => {
  const page = await readSource("pages/resources/index.vue");

  assert.match(page, /<template v-if="allTags\.length">/);
});

// 操作を課題一覧の表に揃える。ボタンを行ごとに出し分けると、編集・削除の位置がずれて押し間違える
test("resources table opens a resource from its title and shares the todo table's icon buttons", async () => {
  const page = await readSource("pages/resources/index.vue");
  const todoTable = await readSource("components/todo/TodoTable.vue");

  assert.match(page, /class="text-blue-600 hover:underline dark:text-blue-400"\s*>\s*\{\{ resource\.title \}\}\s*<\/a>/);
  assert.match(page, /<th class="[^"]*">議事録<\/th>/);
  assert.match(page, /:class="iconButtonClass" aria-label="編集" title="編集" @click="openEditForm\(resource\)"/);
  assert.match(page, /:class="iconButtonClass" aria-label="削除" title="削除" @click="deleteResource\(resource\)"/);
  assert.doesNotMatch(page, /primaryButtonClass, rowButtonClass|class="invisible"/);
  assert.doesNotMatch(page, /resource\.fileName|resource\.fileSize|resource\.linkedApplication/);
  assert.match(todoTable, /import \{ iconButtonClass, inputClass \} from "~\/utils\/ui";/);
});

test("minutes list matches the home cards and the resources search panel", async () => {
  const search = await readSource("components/minutes/MinutesSearch.vue");

  assert.match(search, /class="rounded-xl border border-border bg-surface p-5 shadow-sm"/);
  assert.match(search, /class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm/);
  assert.match(search, /class="space-y-3"/);
  assert.match(search, /class="shrink-0 text-sm text-muted">\{\{ formatDisplayDate\(minutes\.date\) \}\}/);
});

// 見出しと「最終更新」を横に並べると、スマホ幅で見出しが語の途中で折り返す
test("news heading stacks above the updated time on narrow screens", async () => {
  const page = await readSource("pages/news.vue");

  assert.match(page, /class="mt-2\.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8"/);
  assert.match(page, /最終更新<br class="hidden sm:inline">/);
});
