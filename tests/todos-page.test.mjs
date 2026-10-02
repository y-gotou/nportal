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

test("admin todo APIs check the admin role before touching the database", async () => {
  for (const file of ["index.post.ts", "[id].put.ts", "[id].delete.ts"]) {
    const handler = await read(`server/api/admin/todos/${file}`);

    assert.match(handler, /defineEventHandler\(async \(event\) => \{\s*assertAdmin\(event\);/, file);
  }
});

test("todo table shows admin controls only when editable", async () => {
  const table = await read("app/components/todo/TodoTable.vue");

  assert.match(table, /:disabled="!editable/);
  assert.match(table, /<th v-if="editable"/);
  assert.match(table, /<td v-if="editable"/);
});

test("todo page shows the add form only to admins", async () => {
  const page = await read("app/pages/todos.vue");

  assert.match(page, /<form\s+v-if="isAdmin"/);
  assert.match(page, /:editable="isAdmin"/);
});

test("minutes page lists linked todos as a bare read-only table between the body and related resources", async () => {
  const page = await read("app/pages/minutes/[slug]/index.vue");
  const section = page.match(/<section v-if="todos\.length"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(page, /useFetch<TodosResponse>\("\/api\/todos", \{ query: \{ minutesSlug: slug \}/);
  assert.match(section, /^<section v-if="todos\.length" class="mt-4" aria-label="課題">\s*<TodoTable :todos="todos" \/>\s*<\/section>$/);
  assert.ok(page.indexOf("v-html=\"minutes.contentHtml\"") < page.indexOf(section));
  assert.ok(page.indexOf(section) < page.indexOf("title=\"関連資料\""));
});
