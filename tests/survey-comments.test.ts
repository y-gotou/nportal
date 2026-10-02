import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { formatCommentDate } from "../app/utils/survey.ts";
import { deleteSurveyResponses } from "../server/utils/survey.ts";
import {
  deleteUserResponses,
  getResponses,
  saveResponseComment,
} from "../server/utils/survey-response.ts";
import { SURVEY_COMMENT_MAX_LENGTH } from "../shared/utils/survey.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

// モックでは ON CONFLICT と外部キーの連鎖削除を検証できないため、実際のスキーマを SQLite に適用して確かめる
function createDb(): { db: D1DatabaseLike; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  sqlite.exec(`
    INSERT INTO surveys (id, title, status) VALUES (1, '終了済み', 'closed'), (2, '受付中', 'active');
    INSERT INTO questions (id, survey_id, question_text, question_type, allow_other_text) VALUES
      (10, 1, '感想', 'free_text', 0),
      (11, 1, '満足度', 'single_choice', 1),
      (20, 2, '感想', 'free_text', 0);
    INSERT INTO responses (id, question_id, answer, user_email) VALUES
      (100, 10, '資料が欲しい', 'a@example.com'),
      (101, 10, '時間が短い', 'b@example.com'),
      (102, 11, '高い', 'a@example.com'),
      (103, 11, '{"selected":"__other__","otherText":"どちらとも言えない"}', 'b@example.com'),
      (200, 20, '受付中の回答', 'a@example.com');
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

function commentRows(sqlite: DatabaseSync) {
  return sqlite
    .prepare("SELECT response_id, body FROM response_comments ORDER BY response_id")
    .all()
    .map((row) => ({ ...row }));
}

async function assertRejects(promise: Promise<unknown>, statusCode: number) {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal((error as { statusCode?: number }).statusCode, statusCode);
    return true;
  });
}

test("saveResponseComment stores one comment per response and getResponses returns it", async () => {
  const { db, sqlite } = createDb();

  await saveResponseComment(db, 1, 100, "  検討します\n次回までに対応  ");
  await saveResponseComment(db, 1, 100, "対応しました");

  assert.deepEqual(commentRows(sqlite), [{ response_id: 100, body: "対応しました" }]);

  const responses = await getResponses(db, 1);
  const commented = responses.find((response) => response.id === 100);
  const plain = responses.find((response) => response.id === 101);

  assert.equal(commented?.comment, "対応しました");
  assert.match(commented?.commentUpdatedAt ?? "", /^\d{4}-\d{2}-\d{2} /);
  assert.equal(plain?.comment, null);
  assert.equal(plain?.commentUpdatedAt, null);
});

test("saveResponseComment keeps line breaks and accepts the other-text answer of a choice question", async () => {
  const { db, sqlite } = createDb();

  await saveResponseComment(db, 1, 103, "1行目\n2行目");

  assert.deepEqual(commentRows(sqlite), [{ response_id: 103, body: "1行目\n2行目" }]);
});

test("saveResponseComment deletes the comment when the body is blank", async () => {
  const { db, sqlite } = createDb();

  await saveResponseComment(db, 1, 100, "対応しました");
  await saveResponseComment(db, 1, 100, " \n ");

  assert.deepEqual(commentRows(sqlite), []);
});

test("saveResponseComment rejects surveys that are not closed", async () => {
  const { db, sqlite } = createDb();

  await assertRejects(saveResponseComment(db, 2, 200, "コメント"), 409);

  sqlite.exec("UPDATE surveys SET status = 'draft' WHERE id = 2");
  await assertRejects(saveResponseComment(db, 2, 200, "コメント"), 409);
  assert.deepEqual(commentRows(sqlite), []);
});

test("saveResponseComment rejects invalid targets and bodies", async () => {
  const { db, sqlite } = createDb();

  await assertRejects(saveResponseComment(db, 1, 200, "別アンケートの回答"), 404);
  await assertRejects(saveResponseComment(db, 1, 999, "存在しない回答"), 404);
  await assertRejects(saveResponseComment(db, 1, 102, "選択のみの回答"), 400);
  await assertRejects(
    saveResponseComment(db, 1, 100, "あ".repeat(SURVEY_COMMENT_MAX_LENGTH + 1)),
    400,
  );
  await assertRejects(saveResponseComment(db, 1, 100, undefined), 400);
  assert.deepEqual(commentRows(sqlite), []);

  await saveResponseComment(db, 1, 100, "あ".repeat(SURVEY_COMMENT_MAX_LENGTH));
  assert.equal(commentRows(sqlite).length, 1);
});

test("resubmitting answers removes only that respondent's comments", async () => {
  const { db, sqlite } = createDb();
  await saveResponseComment(db, 1, 100, "a さんへのコメント");
  await saveResponseComment(db, 1, 101, "b さんへのコメント");

  await deleteUserResponses(db, 1, "a@example.com");

  assert.deepEqual(commentRows(sqlite), [{ response_id: 101, body: "b さんへのコメント" }]);
});

test("deleting a survey's responses removes their comments", async () => {
  const { db, sqlite } = createDb();
  await saveResponseComment(db, 1, 100, "コメント");
  await saveResponseComment(db, 1, 103, "コメント");

  await deleteSurveyResponses(db, 1);

  assert.deepEqual(commentRows(sqlite), []);
});

test("formatCommentDate は updated_at(UTC)を JST の年月日で表示する", () => {
  assert.equal(formatCommentDate("2026-10-01 15:00:00"), "2026年10月2日");
  assert.equal(formatCommentDate("2026-10-01 14:59:59"), "2026年10月1日");
});
