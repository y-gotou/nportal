import { createError } from "h3";
import type { D1DatabaseLike, Todo } from "../../types/portal.ts";
import { DATE_PATTERN } from "../../shared/utils/date.ts";
import { TODO_ASSIGNEE_MAX_LENGTH, TODO_TITLE_MAX_LENGTH } from "../../shared/utils/todos.ts";

interface TodoRow {
  id: number;
  title: string;
  assignee: string | null;
  due_date: string | null;
  minutes_slug: string | null;
  minutes_title: string | null;
  done_at: string | null;
}

export interface TodoInput {
  title?: unknown;
  assignee?: unknown;
  dueDate?: unknown;
  minutesSlug?: unknown;
  done?: unknown;
}

type TodoFields = Partial<Record<"title" | "assignee" | "due_date" | "minutes_slug", string | null>>;

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage });
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    dueDate: row.due_date,
    minutesSlug: row.minutes_slug,
    minutesTitle: row.minutes_title,
    doneAt: row.done_at,
  };
}

// ponytail: 完了済みを含む全件を返す。完了済みが数百件規模になったら、完了済みは展開時に取得する方式へ切り替える
export async function listTodos(
  db: D1DatabaseLike,
  opts: { minutesSlug?: string } = {},
): Promise<Todo[]> {
  const where = opts.minutesSlug ? "WHERE t.minutes_slug = ?" : "";
  // 未完了は登録の新しい順、完了済みは完了にした日時の新しい順。
  // 登録順に created_at を使わないのは、書き込み元によって日時の形式が混在し得るため
  const stmt = db.prepare(
    `SELECT t.id, t.title, t.assignee, t.due_date, t.minutes_slug, t.done_at, m.title AS minutes_title
     FROM todos t
     LEFT JOIN minutes m ON m.slug = t.minutes_slug
     ${where}
     ORDER BY t.done_at IS NOT NULL, t.done_at DESC, t.id DESC`,
  );
  const { results } = await (opts.minutesSlug ? stmt.bind(opts.minutesSlug) : stmt).all<TodoRow>();
  return results.map(toTodo);
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

// ボディに含まれる項目だけを検証し、列の値へ整形する
async function parseTodoFields(db: D1DatabaseLike, body: TodoInput): Promise<TodoFields> {
  const fields: TodoFields = {};

  if (body.title !== undefined) {
    const title = optionalText(body.title);
    if (!title) throw badRequest("title is required.");
    if (title.length > TODO_TITLE_MAX_LENGTH) throw badRequest("title is too long.");
    fields.title = title;
  }

  if (body.assignee !== undefined) {
    const assignee = optionalText(body.assignee);
    if (assignee && assignee.length > TODO_ASSIGNEE_MAX_LENGTH) throw badRequest("assignee is too long.");
    fields.assignee = assignee;
  }

  if (body.dueDate !== undefined) {
    const dueDate = optionalText(body.dueDate);
    if (dueDate && !DATE_PATTERN.test(dueDate)) throw badRequest("dueDate must be YYYY-MM-DD.");
    fields.due_date = dueDate;
  }

  if (body.minutesSlug !== undefined) {
    const minutesSlug = optionalText(body.minutesSlug);
    if (minutesSlug) {
      const minutes = await db.prepare("SELECT slug FROM minutes WHERE slug = ?").bind(minutesSlug).first();
      if (!minutes) throw badRequest("minutes not found.");
    }
    fields.minutes_slug = minutesSlug;
  }

  if (body.done !== undefined && typeof body.done !== "boolean") {
    throw badRequest("done must be a boolean.");
  }

  return fields;
}

export async function createTodo(db: D1DatabaseLike, body: TodoInput): Promise<void> {
  const fields = await parseTodoFields(db, body);
  if (!fields.title) throw badRequest("title is required.");

  await db
    .prepare("INSERT INTO todos (title, assignee, due_date, minutes_slug) VALUES (?, ?, ?, ?)")
    .bind(fields.title, fields.assignee ?? null, fields.due_date ?? null, fields.minutes_slug ?? null)
    .first();
}

export async function updateTodo(db: D1DatabaseLike, id: number, body: TodoInput): Promise<void> {
  const fields = await parseTodoFields(db, body);
  const now = new Date().toISOString();
  const sets = Object.keys(fields).map((column) => `${column} = ?`);
  const values: unknown[] = Object.values(fields);

  if (body.done === true) {
    // 既に完了している課題は、最初に完了にした日時を保つ
    sets.push("done_at = COALESCE(done_at, ?)");
    values.push(now);
  }
  else if (body.done === false) {
    sets.push("done_at = NULL");
  }

  if (sets.length === 0) throw badRequest("No fields to update.");

  const row = await db
    .prepare(`UPDATE todos SET ${sets.join(", ")}, updated_at = ? WHERE id = ? RETURNING id`)
    .bind(...values, now, id)
    .first();

  if (!row) throw createError({ statusCode: 404, statusMessage: "Todo not found." });
}

export async function deleteTodo(db: D1DatabaseLike, id: number): Promise<void> {
  const row = await db.prepare("DELETE FROM todos WHERE id = ? RETURNING id").bind(id).first();

  if (!row) throw createError({ statusCode: 404, statusMessage: "Todo not found." });
}
