import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("global navigation lists the todo page after surveys with shortened labels", async () => {
  const header = await read("app/components/site/SiteHeader.vue");
  const navItems = header.match(/const navItems = \[([\s\S]*?)\];/)?.[1] ?? "";
  const items = [...navItems.matchAll(/to: "([^"]+)", label: "([^"]+)"/g)].map((match) => [match[2], match[1]]);

  assert.deepEqual(
    items.map(([label]) => label),
    ["ホーム", "議事録", "スケジュール", "アンケート", "課題", "資料", "発表", "ニュース", "BBS"],
  );
  assert.equal(Object.fromEntries(items)["課題"], "/todos");
});

test("resource and speaker pages keep their original headings", async () => {
  assert.match(await read("app/pages/resources/index.vue"), /<SectionHeader title="資料一覧">/);
  assert.match(await read("app/pages/speakers.vue"), /title: "発表募集"/);
});

// 誰が操作できるかは、利用者を受け取った updateTodo・deleteTodo が課題ごとに判定する(todos-server.test.ts)
test("todo write APIs require a signed-in user and pass it on for the permission check", async () => {
  const handlers = {
    "todos.post.ts": /createTodo\(getDb\(event\), body \?\? \{\}, user\.email\)/,
    "todos/[id].put.ts": /updateTodo\(getDb\(event\), id, body \?\? \{\}, user\)/,
    "todos/[id].delete.ts": /deleteTodo\(getDb\(event\), id, user\)/,
  };

  for (const [file, call] of Object.entries(handlers)) {
    const handler = await read(`server/api/${file}`);

    assert.match(handler, /defineEventHandler\(async \(event\) => \{\s*const user = requireUser\(event\);/, file);
    assert.match(handler, call, file);
  }
});

test("todo table decides the controls per row from the current user", async () => {
  const table = await read("app/components/todo/TodoTable.vue");

  assert.match(table, /const canEdit = \(todo: Todo\) => canEditTodo\(todo, props\.user\);/);
  assert.match(table, /:disabled="!canEdit\(todo\) \|\| isSaving"/);
  assert.match(table, /<td v-if="hasEditable"[^>]*>\s*<template v-if="canEdit\(todo\)">/);
  assert.match(table, /<th v-if="showCreatedBy"[^>]*>登録者<\/th>/);
  assert.match(table, /chatDisplayName\(todo\.createdBy\)/);
});

test("todo page shows the add form and the creator column to every user", async () => {
  const page = await read("app/pages/todos.vue");

  assert.doesNotMatch(page, /isAdmin/);
  assert.match(page, /<form\s+class=/);
  assert.match(page, /:user="currentUser"[\s\S]*?show-created-by/);
});

test("minutes page lists linked todos as a bare read-only table between the body and related resources", async () => {
  const page = await read("app/pages/minutes/[slug]/index.vue");
  const section = page.match(/<section v-if="todos\.length"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(page, /useFetch<TodosResponse>\("\/api\/todos", \{ query: \{ minutesSlug: slug \}/);
  assert.match(section, /^<section v-if="todos\.length" class="mt-4" aria-label="課題">\s*<TodoTable :todos="todos" \/>\s*<\/section>$/);
  assert.ok(page.indexOf("v-html=\"minutes.contentHtml\"") < page.indexOf(section));
  assert.ok(page.indexOf(section) < page.indexOf("title=\"関連資料\""));
});
