import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { deleteMinutes } from "../server/utils/minutes.ts";
import { createTodo, deleteTodo, listTodos, updateTodo } from "../server/utils/todos.ts";
import { TODO_ASSIGNEE_MAX_LENGTH, TODO_TITLE_MAX_LENGTH } from "../shared/utils/todos.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

// 並び順と外部キーの動作はモックでは検証できないため、実際のスキーマを SQLite に適用して確かめる
function createDb(): { db: D1DatabaseLike; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  sqlite.exec(`
    INSERT INTO minutes (slug, title, date) VALUES
      ('2026-09-18', '第11回 AI会議', '2026-09-18'),
      ('2026-10-02', '第12回 AI会議', '2026-10-02');
  `);

  const statement = (query: string, bound: unknown[]): D1PreparedStatement => ({
    bind: (...values: unknown[]) => statement(query, values),
    async first<T>() {
      return (sqlite.prepare(query).get(...(bound as never[])) as T | undefined) ?? null;
    },
    async all<T>() {
      return { results: sqlite.prepare(query).all(...(bound as never[])) as T[] };
    },
  });

  return {
    sqlite,
    db: {
      prepare: (query: string) => statement(query, []),
      async batch(statements: D1PreparedStatement[]) {
        for (const item of statements) await item.first();
      },
    },
  };
}

async function assertRejects(promise: Promise<unknown>, statusCode: number) {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal((error as { statusCode?: number }).statusCode, statusCode);
    return true;
  });
}

async function titles(db: D1DatabaseLike, minutesSlug?: string) {
  return (await listTodos(db, { minutesSlug })).map((todo) => todo.title);
}

test("createTodo trims the title and stores blank optional fields as unset", async () => {
  const { db } = createDb();

  await createTodo(db, { title: "  資料をまとめる  ", assignee: "  ", dueDate: "", minutesSlug: "" });

  assert.deepEqual(await listTodos(db), [
    {
      id: 1,
      title: "資料をまとめる",
      assignee: null,
      dueDate: null,
      minutesSlug: null,
      minutesTitle: null,
      doneAt: null,
    },
  ]);
});

test("createTodo stores the assignee, due date and minutes, and listTodos returns the minutes title", async () => {
  const { db } = createDb();

  await createTodo(db, {
    title: "録画の共有可否を確認する",
    assignee: " 運営 ",
    dueDate: "2026-10-16",
    minutesSlug: "2026-09-18",
  });

  const [todo] = await listTodos(db);
  assert.equal(todo?.assignee, "運営");
  assert.equal(todo?.dueDate, "2026-10-16");
  assert.equal(todo?.minutesSlug, "2026-09-18");
  assert.equal(todo?.minutesTitle, "第11回 AI会議");
});

test("createTodo rejects invalid input", async () => {
  const { db } = createDb();

  await assertRejects(createTodo(db, {}), 400);
  await assertRejects(createTodo(db, { title: "   " }), 400);
  await assertRejects(createTodo(db, { title: "あ".repeat(TODO_TITLE_MAX_LENGTH + 1) }), 400);
  await assertRejects(
    createTodo(db, { title: "課題", assignee: "あ".repeat(TODO_ASSIGNEE_MAX_LENGTH + 1) }),
    400,
  );
  await assertRejects(createTodo(db, { title: "課題", dueDate: "10/16" }), 400);
  await assertRejects(createTodo(db, { title: "課題", minutesSlug: "2000-01-01" }), 400);
  await assertRejects(createTodo(db, { title: "課題", done: "yes" }), 400);

  assert.deepEqual(await listTodos(db), []);
});

test("createTodo accepts a title and an assignee at the maximum length", async () => {
  const { db } = createDb();

  await createTodo(db, {
    title: "あ".repeat(TODO_TITLE_MAX_LENGTH),
    assignee: "あ".repeat(TODO_ASSIGNEE_MAX_LENGTH),
  });

  assert.equal((await listTodos(db)).length, 1);
});

test("listTodos puts open todos first by newest registration, then done todos by newest completion", async () => {
  const { db, sqlite } = createDb();

  for (const title of ["A", "B", "C", "D", "E"]) await createTodo(db, { title });
  sqlite.exec(`
    UPDATE todos SET done_at = '2026-10-01T00:00:00.000Z' WHERE title = 'D';
    UPDATE todos SET done_at = '2026-10-02T00:00:00.000Z' WHERE title = 'A';
  `);

  assert.deepEqual(await titles(db), ["E", "C", "B", "A", "D"]);
});

test("listTodos filters by minutes slug", async () => {
  const { db } = createDb();

  await createTodo(db, { title: "第11回の課題", minutesSlug: "2026-09-18" });
  await createTodo(db, { title: "第12回の課題", minutesSlug: "2026-10-02" });
  await createTodo(db, { title: "紐付けなし" });

  assert.deepEqual(await titles(db, "2026-09-18"), ["第11回の課題"]);
  assert.deepEqual(await titles(db, "2000-01-01"), []);
});

test("updateTodo changes only the given fields", async () => {
  const { db } = createDb();
  await createTodo(db, { title: "課題", assignee: "運営", dueDate: "2026-10-16" });

  await updateTodo(db, 1, { title: " 新しい件名 ", minutesSlug: "2026-10-02" });

  const [todo] = await listTodos(db);
  assert.equal(todo?.title, "新しい件名");
  assert.equal(todo?.assignee, "運営");
  assert.equal(todo?.dueDate, "2026-10-16");
  assert.equal(todo?.minutesTitle, "第12回 AI会議");

  await updateTodo(db, 1, { assignee: "", dueDate: "", minutesSlug: "" });

  const [cleared] = await listTodos(db);
  assert.equal(cleared?.title, "新しい件名");
  assert.equal(cleared?.assignee, null);
  assert.equal(cleared?.dueDate, null);
  assert.equal(cleared?.minutesSlug, null);
});

test("updateTodo toggles completion and keeps the first completion time", async () => {
  const { db, sqlite } = createDb();
  await createTodo(db, { title: "課題" });

  await updateTodo(db, 1, { done: true });
  const [done] = await listTodos(db);
  assert.match(done?.doneAt ?? "", /^\d{4}-\d{2}-\d{2}T.*Z$/);

  sqlite.exec("UPDATE todos SET done_at = '2026-01-01T00:00:00.000Z' WHERE id = 1");
  await updateTodo(db, 1, { done: true });
  assert.equal((await listTodos(db))[0]?.doneAt, "2026-01-01T00:00:00.000Z");

  await updateTodo(db, 1, { done: false });
  assert.equal((await listTodos(db))[0]?.doneAt, null);
});

test("updateTodo rejects invalid input, an empty body and a missing todo", async () => {
  const { db } = createDb();
  await createTodo(db, { title: "課題" });

  await assertRejects(updateTodo(db, 1, { title: " " }), 400);
  await assertRejects(updateTodo(db, 1, { dueDate: "2026/10/16" }), 400);
  await assertRejects(updateTodo(db, 1, { minutesSlug: "2000-01-01" }), 400);
  await assertRejects(updateTodo(db, 1, { done: 1 }), 400);
  await assertRejects(updateTodo(db, 1, {}), 400);
  await assertRejects(updateTodo(db, 99, { title: "課題" }), 404);

  assert.deepEqual(await titles(db), ["課題"]);
});

test("deleteTodo removes the todo and rejects a missing one", async () => {
  const { db } = createDb();
  await createTodo(db, { title: "残す" });
  await createTodo(db, { title: "消す" });

  await deleteTodo(db, 2);
  assert.deepEqual(await titles(db), ["残す"]);

  await assertRejects(deleteTodo(db, 2), 404);
});

test("deleting minutes keeps the linked todos and clears only the link", async () => {
  const { db } = createDb();
  await createTodo(db, { title: "第11回の課題", minutesSlug: "2026-09-18" });
  await createTodo(db, { title: "第12回の課題", minutesSlug: "2026-10-02" });

  await deleteMinutes(db, "2026-09-18");

  const todos = await listTodos(db);
  assert.deepEqual(
    todos.map((todo) => [todo.title, todo.minutesSlug, todo.minutesTitle]),
    [
      ["第12回の課題", "2026-10-02", "第12回 AI会議"],
      ["第11回の課題", null, null],
    ],
  );
});
