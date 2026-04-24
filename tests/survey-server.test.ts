import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteUserResponses,
  getSurvey,
  hasSurveyResponseData,
  listSurveys,
  touchSubmission,
} from "../server/utils/survey.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

interface MockDbOptions {
  surveyRows?: Array<{
    id: number;
    title: string;
    description: string;
    created_at: string;
    status: string;
  }>;
  questionRows?: Array<{
    id: number;
    survey_id: number;
    question_text: string;
    question_type: "single_choice" | "multiple_choice" | "free_text";
    options: string;
    allow_other_text: number;
    sort_order: number;
  }>;
  submissionCounts?: Array<{ survey_id: number; response_count: number }>;
  fallbackCounts?: Array<{ survey_id: number; response_count: number }>;
  legacyCounts?: Array<{ survey_id: number; response_count: number }>;
  respondedSurveyIds?: number[];
  submissionExistsForSurveyIds?: number[];
  responseExistsForSurveyIds?: number[];
}

const defaultSurveyRows = [
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
];

const defaultQuestionRows = [
  {
    id: 1,
    survey_id: 1,
    question_text: "満足度",
    question_type: "single_choice" as const,
    options: "[\"高い\",\"普通\"]",
    allow_other_text: 0,
    sort_order: 1,
  },
  {
    id: 2,
    survey_id: 2,
    question_text: "テーマ",
    question_type: "multiple_choice" as const,
    options: "[\"RAG\",\"MLOps\"]",
    allow_other_text: 1,
    sort_order: 1,
  },
  {
    id: 3,
    survey_id: 3,
    question_text: "下書き設問",
    question_type: "free_text" as const,
    options: "[]",
    allow_other_text: 0,
    sort_order: 1,
  },
];

function createPreparedStatement(
  query: string,
  options: MockDbOptions = {},
): D1PreparedStatement {
  let boundValues: unknown[] = [];

  return {
    bind(...values: unknown[]) {
      boundValues = values;
      return this;
    },
    async first() {
      if (query.includes("SELECT * FROM surveys WHERE id = ?")) {
        const surveyId = boundValues[0];
        return (
          (options.surveyRows ?? defaultSurveyRows).find((row) => row.id === surveyId)
          ?? null
        );
      }

      if (query.includes("SELECT id FROM submissions WHERE survey_id = ? LIMIT 1")) {
        const surveyId = boundValues[0];
        if (
          typeof surveyId === "number"
          && (options.submissionExistsForSurveyIds ?? []).includes(surveyId)
        ) {
          return { id: 1 };
        }

        return null;
      }

      if (query.includes("SELECT r.id") && query.includes("WHERE q.survey_id = ?")) {
        const surveyId = boundValues[0];
        if (
          typeof surveyId === "number"
          && (options.responseExistsForSurveyIds ?? []).includes(surveyId)
        ) {
          return { id: 1 };
        }

        return null;
      }

      return null;
    },
    async all() {
      if (query.includes("SELECT * FROM surveys")) {
        return {
          results: options.surveyRows ?? defaultSurveyRows,
        };
      }

      if (query.includes("SELECT * FROM questions WHERE survey_id = ?")) {
        const surveyId = boundValues[0];
        return {
          results: (options.questionRows ?? defaultQuestionRows).filter(
            (row) => row.survey_id === surveyId,
          ),
        };
      }

      if (query.includes("SELECT * FROM questions")) {
        return {
          results: options.questionRows ?? defaultQuestionRows,
        };
      }

      if (query.includes("FROM submissions") && query.includes("COUNT(*) AS response_count")) {
        return {
          results: options.submissionCounts ?? [],
        };
      }

      if (query.includes("COUNT(DISTINCT r.user_email) AS response_count")) {
        return {
          results: options.fallbackCounts ?? [],
        };
      }

      if (query.includes("COUNT(r.id) AS response_count")) {
        return {
          results: options.legacyCounts ?? [],
        };
      }

      if (query.includes("SELECT survey_id FROM submissions WHERE user_email = ?")) {
        const userEmail = boundValues[0];
        if (typeof userEmail !== "string") {
          return { results: [] };
        }

        return {
          results: (options.respondedSurveyIds ?? []).map((survey_id) => ({
            survey_id,
            user_email: userEmail,
          })),
        };
      }

      return { results: [] };
    },
  };
}

function createDb(options: MockDbOptions = {}): D1DatabaseLike {
  return {
    prepare(query: string) {
      return createPreparedStatement(query, options);
    },
    async batch() {
      return [];
    },
  };
}

test("listSurveys counts respondents from submissions for survey cards", async () => {
  const surveys = await listSurveys(
    createDb({
      submissionCounts: [
        { survey_id: 1, response_count: 2 },
        { survey_id: 2, response_count: 0 },
        { survey_id: 3, response_count: 0 },
      ],
      fallbackCounts: [
        { survey_id: 1, response_count: 3 },
      ],
    }),
  );

  assert.equal(surveys.length, 2);
  assert.equal(surveys[0].responseCount, 2);
  assert.equal(surveys[1].responseCount, 0);
  assert.equal(surveys[0].status, "active");
  assert.equal(surveys[1].status, "closed");
  assert.equal(surveys[0].questions[0]?.allowOtherText, false);
  assert.equal(surveys[1].questions[0]?.allowOtherText, true);
});

test("listSurveys falls back to distinct response users when submissions are missing", async () => {
  const surveys = await listSurveys(
    createDb({
      fallbackCounts: [
        { survey_id: 1, response_count: 2 },
        { survey_id: 2, response_count: 1 },
      ],
      legacyCounts: [
        { survey_id: 1, response_count: 4 },
        { survey_id: 2, response_count: 3 },
      ],
    }),
  );

  assert.equal(surveys[0].responseCount, 2);
  assert.equal(surveys[1].responseCount, 1);
});

test("listSurveys falls back to legacy response counts for pre-migration data", async () => {
  const surveys = await listSurveys(
    createDb({
      legacyCounts: [
        { survey_id: 1, response_count: 3 },
        { survey_id: 2, response_count: 1 },
      ],
    }),
  );

  assert.equal(surveys[0].responseCount, 3);
  assert.equal(surveys[1].responseCount, 1);
});

test("listSurveys marks surveys as responded for the current user", async () => {
  const surveys = await listSurveys(
    createDb({
      submissionCounts: [{ survey_id: 1, response_count: 1 }],
      respondedSurveyIds: [1],
    }),
    "member@example.com",
  );

  assert.equal(surveys[0].hasResponded, true);
  assert.equal(surveys[1].hasResponded, false);
});

test("listSurveys includes draft surveys for admin views when requested", async () => {
  const surveys = await listSurveys(createDb(), undefined, { includeDraft: true });

  assert.equal(surveys.length, 3);
  assert.deepEqual(
    surveys.map((survey) => survey.status),
    ["active", "closed", "draft"],
  );
});

test("getSurvey includes respondent counts for detail views", async () => {
  const survey = await getSurvey(
    createDb({
      submissionCounts: [{ survey_id: 1, response_count: 2 }],
      fallbackCounts: [{ survey_id: 1, response_count: 3 }],
      legacyCounts: [{ survey_id: 1, response_count: 4 }],
    }),
    1,
  );

  assert.equal(survey?.responseCount, 2);
  assert.equal(survey?.questions.length, 1);
});

test("hasSurveyResponseData returns true when at least one submission exists", async () => {
  const hasResponseData = await hasSurveyResponseData(
    createDb({ submissionExistsForSurveyIds: [1] }),
    1,
  );

  assert.equal(hasResponseData, true);
});

test("hasSurveyResponseData returns true when legacy responses exist without submissions", async () => {
  const hasResponseData = await hasSurveyResponseData(
    createDb({ responseExistsForSurveyIds: [2] }),
    2,
  );

  assert.equal(hasResponseData, true);
});

test("hasSurveyResponseData returns false when no submissions or responses exist", async () => {
  const hasResponseData = await hasSurveyResponseData(createDb(), 2);

  assert.equal(hasResponseData, false);
});

interface QueryCall {
  query: string;
  values: unknown[];
}

function createRecordingDb(): { db: D1DatabaseLike; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const db: D1DatabaseLike = {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          bound = values;
          return stmt;
        },
        async first() {
          calls.push({ query, values: bound });
          return null;
        },
        async all() {
          calls.push({ query, values: bound });
          return { results: [] };
        },
      };
      return stmt;
    },
    async batch() {
      return [];
    },
  };
  return { db, calls };
}

test("deleteUserResponses scopes the delete by survey and user", async () => {
  const { db, calls } = createRecordingDb();
  await deleteUserResponses(db, 7, "member@example.com");

  assert.equal(calls.length, 1);
  assert.match(calls[0].query, /DELETE FROM responses/);
  assert.match(
    calls[0].query,
    /question_id IN \(SELECT id FROM questions WHERE survey_id = \?\)/,
  );
  assert.deepEqual(calls[0].values, ["member@example.com", 7]);
});

test("touchSubmission updates submitted_at for the existing submission", async () => {
  const { db, calls } = createRecordingDb();
  await touchSubmission(db, 7, "member@example.com");

  assert.equal(calls.length, 1);
  assert.match(calls[0].query, /UPDATE submissions/);
  assert.match(calls[0].query, /SET submitted_at = datetime\('now'\)/);
  assert.match(calls[0].query, /WHERE survey_id = \? AND user_email = \?/);
  assert.deepEqual(calls[0].values, [7, "member@example.com"]);
});
