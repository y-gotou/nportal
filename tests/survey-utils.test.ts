import assert from "node:assert/strict";
import test from "node:test";
import { buildSurveyResultBlocks, parseMultipleChoiceAnswer, parseSurveyOptions, serializeSurveyAnswer } from "../utils/survey.ts";
import type { Survey, SurveyResponse } from "../types/portal.ts";

const survey: Survey = {
  id: 10,
  title: "勉強会アンケート",
  description: "テスト用アンケート",
  createdAt: "2026-04-01",
  isActive: true,
  questions: [
    {
      id: 100,
      questionText: "満足度",
      questionType: "single_choice",
      options: ["高い", "普通", "低い"],
    },
    {
      id: 101,
      questionText: "興味のあるテーマ",
      questionType: "multiple_choice",
      options: ["RAG", "評価", "運用"],
    },
    {
      id: 102,
      questionText: "自由記述",
      questionType: "free_text",
      options: [],
    },
  ],
};

const responses: SurveyResponse[] = [
  { questionId: 100, answer: "高い", submittedAt: "2026-04-01T10:00:00Z" },
  { questionId: 100, answer: "普通", submittedAt: "2026-04-01T10:01:00Z" },
  { questionId: 101, answer: "[\"RAG\",\"運用\"]", submittedAt: "2026-04-01T10:02:00Z" },
  { questionId: 101, answer: "評価, 運用", submittedAt: "2026-04-01T10:03:00Z" },
  { questionId: 102, answer: " 参考になりました ", submittedAt: "2026-04-01T10:04:00Z" },
  { questionId: 102, answer: " ", submittedAt: "2026-04-01T10:05:00Z" },
];

test("survey answer helpers normalize option values", () => {
  assert.deepEqual(parseSurveyOptions("[\"RAG\",\"評価\"]"), ["RAG", "評価"]);
  assert.deepEqual(parseSurveyOptions("invalid"), []);
  assert.deepEqual(parseMultipleChoiceAnswer("[\"RAG\",\"運用\"]"), ["RAG", "運用"]);
  assert.deepEqual(parseMultipleChoiceAnswer("評価, 運用"), ["評価", "運用"]);
  assert.equal(serializeSurveyAnswer(["RAG", "評価"]), "[\"RAG\",\"評価\"]");
  assert.equal(serializeSurveyAnswer("自由記述"), "自由記述");
});

test("buildSurveyResultBlocks aggregates survey responses by question type", () => {
  const blocks = buildSurveyResultBlocks(survey, responses);

  assert.equal(blocks[0].responseCount, 2);
  assert.deepEqual(blocks[0].distribution, [
    { label: "高い", value: 1, width: "50%" },
    { label: "普通", value: 1, width: "50%" },
    { label: "低い", value: 0, width: "0%" },
  ]);

  assert.equal(blocks[1].responseCount, 2);
  assert.deepEqual(blocks[1].distribution, [
    { label: "RAG", value: 1, width: "50%" },
    { label: "評価", value: 1, width: "50%" },
    { label: "運用", value: 2, width: "100%" },
  ]);

  assert.equal(blocks[2].responseCount, 2);
  assert.deepEqual(blocks[2].freeTextAnswers, ["参考になりました"]);
  assert.deepEqual(blocks[2].distribution, []);
});
