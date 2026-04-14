import assert from "node:assert/strict";
import test from "node:test";
import { listSurveys } from "../server/utils/survey.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

function createPreparedStatement(query: string): D1PreparedStatement {
  return {
    bind() {
      return this;
    },
    async first() {
      return null;
    },
    async all() {
      if (query.includes("SELECT * FROM surveys")) {
        return {
          results: [
            {
              id: 1,
              title: "第11回 勉強会フィードバック",
              description: "LLMのファインチューニング入門についての感想をお聞かせください",
              created_at: "2026-04-03",
              status: "active",
            },
            {
              id: 2,
              title: "今後のテーマ希望アンケート",
              description: "次回以降の勉強会で取り上げてほしいテーマを教えてください",
              created_at: "2026-03-31",
              status: "closed",
            },
            {
              id: 3,
              title: "下書きアンケート",
              description: "管理画面のみで編集中",
              created_at: "2026-04-10",
              status: "draft",
            },
          ],
        };
      }

      if (query.includes("SELECT * FROM questions")) {
        return {
          results: [
            {
              id: 1,
              survey_id: 1,
              question_text: "満足度",
              question_type: "single_choice",
              options: "[\"高い\",\"普通\"]",
              allow_other_text: 0,
              sort_order: 1,
            },
            {
              id: 2,
              survey_id: 2,
              question_text: "テーマ",
              question_type: "multiple_choice",
              options: "[\"RAG\",\"MLOps\"]",
              allow_other_text: 1,
              sort_order: 1,
            },
            {
              id: 3,
              survey_id: 3,
              question_text: "下書き設問",
              question_type: "free_text",
              options: "[]",
              allow_other_text: 0,
              sort_order: 1,
            },
          ],
        };
      }

      if (query.includes("COUNT(r.id) AS response_count")) {
        return {
          results: [
            { survey_id: 1, response_count: 3 },
            { survey_id: 2, response_count: 0 },
            { survey_id: 3, response_count: 0 },
          ],
        };
      }

      return { results: [] };
    },
  };
}

const db: D1DatabaseLike = {
  prepare(query: string) {
    return createPreparedStatement(query);
  },
  async batch() {
    return [];
  },
};

test("listSurveys includes response counts for survey cards", async () => {
  const surveys = await listSurveys(db);

  assert.equal(surveys.length, 2);
  assert.equal(surveys[0].responseCount, 3);
  assert.equal(surveys[1].responseCount, 0);
  assert.equal(surveys[0].status, "active");
  assert.equal(surveys[1].status, "closed");
  assert.equal(surveys[0].questions[0]?.allowOtherText, false);
  assert.equal(surveys[1].questions[0]?.allowOtherText, true);
});

test("listSurveys includes draft surveys for admin views when requested", async () => {
  const surveys = await listSurveys(db, undefined, { includeDraft: true });

  assert.equal(surveys.length, 3);
  assert.deepEqual(
    surveys.map((survey) => survey.status),
    ["active", "closed", "draft"],
  );
});
