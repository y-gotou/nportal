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
              is_active: 1,
            },
            {
              id: 2,
              title: "今後のテーマ希望アンケート",
              description: "次回以降の勉強会で取り上げてほしいテーマを教えてください",
              created_at: "2026-03-31",
              is_active: 1,
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
          ],
        };
      }

      if (query.includes("COUNT(r.id) AS response_count")) {
        return {
          results: [
            { survey_id: 1, response_count: 3 },
            { survey_id: 2, response_count: 0 },
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

  assert.equal(surveys[0].responseCount, 3);
  assert.equal(surveys[1].responseCount, 0);
  assert.equal(surveys[0].questions[0]?.allowOtherText, false);
  assert.equal(surveys[1].questions[0]?.allowOtherText, true);
});
