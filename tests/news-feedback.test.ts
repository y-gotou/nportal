import assert from "node:assert/strict";
import test from "node:test";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";
import { buildFeedbackSummary } from "../server/utils/news-feedback.ts";

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://example.com/news/1",
    title: "サンプル記事",
    source: "ITmedia AI+",
    category: "プロダクト",
    impact_axis: "tooling",
    tags: JSON.stringify(["コスト"]),
    published_date: dateDaysAgo(5),
    ai_score: 80,
    up_count: 0,
    down_count: 0,
    ...overrides,
  };
}

function createDb(articleRows: Record<string, unknown>[]): D1DatabaseLike {
  return {
    prepare(query: string) {
      const statement: D1PreparedStatement = {
        bind: () => statement,
        async first() {
          return null;
        },
        async all() {
          if (query.includes("FROM news_articles")) {
            return { results: articleRows as never[] };
          }
          return { results: [] };
        },
      };
      return statement;
    },
    async batch() {
      return [];
    },
  };
}

test("重みの集計は直近 90 日の掲載記事に限定される", async () => {
  const summary = await buildFeedbackSummary(
    createDb([
      makeRow({
        url: "https://example.com/recent",
        source: "最近の出典",
        up_count: 10,
        published_date: dateDaysAgo(10),
      }),
      makeRow({
        url: "https://example.com/old",
        source: "古い出典",
        down_count: 10,
        published_date: dateDaysAgo(120),
      }),
    ]),
  );

  assert.ok(summary.weights.source["最近の出典"]! > 1);
  assert.equal(summary.weights.source["古い出典"], undefined);
});

test("disliked には 👎 が 👍 を上回るタグだけが入る", async () => {
  const summary = await buildFeedbackSummary(
    createDb([
      makeRow({
        url: "https://example.com/popular",
        tags: JSON.stringify(["人気タグ"]),
        up_count: 20,
        down_count: 3,
      }),
      makeRow({
        url: "https://example.com/unpopular",
        tags: JSON.stringify(["不評タグ"]),
        up_count: 1,
        down_count: 5,
      }),
    ]),
  );

  assert.deepEqual(
    summary.tags.disliked.map((entry) => entry.tag),
    ["不評タグ"],
  );
  assert.ok(summary.tags.liked.some((entry) => entry.tag === "人気タグ"));
});
