import assert from "node:assert/strict";
import test from "node:test";
import {
  digestWindowStart,
  jstToday,
  normalizeUrl,
  parseIngestArticle,
  requireCurrentJstDate,
  validateDigestSelection,
} from "../server/utils/news-ingest.ts";

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://example.com/news/1",
    title: "サンプル記事",
    source: "ITmedia AI+",
    category: "プロダクト",
    impact_axis: "tooling",
    tags: ["コスト"],
    summary: "推論コストが下がりました。",
    why_important: "試算の見直しが必要です。",
    glossary: [],
    ai_score: 80,
    article_date: "2026-07-30",
    ...overrides,
  };
}

test("normalizeUrl は計測用パラメータとフラグメントを除去する", () => {
  assert.equal(
    normalizeUrl("https://example.com/news/1?utm_source=x&id=5&fbclid=abc#section"),
    "https://example.com/news/1?id=5",
  );
});

test("normalizeUrl は末尾スラッシュとホスト名の大小を揃える", () => {
  assert.equal(normalizeUrl("https://EXAMPLE.com/news/1/"), "https://example.com/news/1");
  assert.equal(normalizeUrl("https://example.com/"), "https://example.com/");
});

test("normalizeUrl は記事IDを含むクエリを残す", () => {
  assert.equal(normalizeUrl("https://example.com/?p=123"), "https://example.com/?p=123");
});

test("parseIngestArticle は正常な入力を受け入れる", () => {
  const article = parseIngestArticle(makeArticle());
  assert.equal(article.category, "プロダクト");
  assert.equal(article.impactAxis, "tooling");
  assert.deepEqual(article.tags, ["コスト"]);
});

test("parseIngestArticle は未定義のカテゴリを拒否する", () => {
  assert.throws(() => parseIngestArticle(makeArticle({ category: "市場" })), /category must be/);
});

test("parseIngestArticle は未定義の観点を拒否する", () => {
  assert.throws(() => parseIngestArticle(makeArticle({ impact_axis: "other" })), /impact_axis/);
});

test("parseIngestArticle は範囲外の ai_score を拒否する", () => {
  assert.throws(() => parseIngestArticle(makeArticle({ ai_score: 120 })), /ai_score/);
});

test("parseIngestArticle は用語注のない [[用語]] を拒否する", () => {
  assert.throws(
    () => parseIngestArticle(makeArticle({ summary: "[[RAG]]の精度が向上しました。" })),
    /glossary has no matching term/,
  );
});

test("parseIngestArticle は用語注が対応していれば受け入れる", () => {
  const article = parseIngestArticle(
    makeArticle({
      summary: "[[RAG]]の精度が向上しました。",
      glossary: [{ term: "RAG", description: "社内文書を検索して回答させる仕組み。" }],
    }),
  );
  assert.equal(article.glossary.length, 1);
});

test("parseIngestArticle は必須項目の欠落を拒否する", () => {
  assert.throws(() => parseIngestArticle(makeArticle({ title: "" })), /title is required/);
});

// 日次 routine の実行時刻(07:00 JST)は UTC では前日 22:00 のため、UTC と JST で日付がずれる時刻で検証する
const DAILY_RUN_AT = Date.parse("2026-08-05T22:06:00Z"); // = 2026-08-06 07:06 JST

test("jstToday は UTC の時刻から JST の日付を返す", () => {
  assert.equal(jstToday(DAILY_RUN_AT), "2026-08-06");
});

test("requireCurrentJstDate は JST 当日を受け入れる", () => {
  assert.equal(requireCurrentJstDate("2026-08-06", "published_date", DAILY_RUN_AT), "2026-08-06");
});

test("requireCurrentJstDate は UTC 日付(JST の前日)を拒否する", () => {
  assert.throws(
    () => requireCurrentJstDate("2026-08-05", "published_date", DAILY_RUN_AT),
    /must be today in JST \(2026-08-06\), got: 2026-08-05/,
  );
});

test("requireCurrentJstDate は書式不正を拒否する", () => {
  assert.throws(
    () => requireCurrentJstDate("2026/08/06", "published_date", DAILY_RUN_AT),
    /must be in YYYY-MM-DD format/,
  );
});

// 週次ダイジェストの選定検証(選定窓と practice / learning の最低枠)

function selectionArticle(overrides: Record<string, string> = {}) {
  return {
    url: "https://example.com/news/1",
    publishedDate: "2026-08-03",
    impactAxis: "tooling",
    ...overrides,
  };
}

test("digestWindowStart は実行日の 7 日前(前週木曜)を返す", () => {
  assert.equal(digestWindowStart("2026-08-13"), "2026-08-06");
  assert.equal(digestWindowStart("2026-09-03"), "2026-08-27"); // 月またぎ
});

test("validateDigestSelection は窓内かつ最低枠を満たす選定を受け入れる", () => {
  validateDigestSelection(
    "2026-08-13",
    [
      selectionArticle({ publishedDate: "2026-08-06" }), // 窓の下端(前週木曜)
      selectionArticle({ publishedDate: "2026-08-12", impactAxis: "practice" }), // 窓の上端(前日)
    ],
    true,
  );
});

test("validateDigestSelection は窓より前の記事を拒否する", () => {
  assert.throws(
    () =>
      validateDigestSelection(
        "2026-08-13",
        [selectionArticle({ publishedDate: "2026-08-05", impactAxis: "practice" })],
        true,
      ),
    /must be published between 2026-08-06/,
  );
});

test("validateDigestSelection は実行日当日の記事を拒否する", () => {
  assert.throws(
    () =>
      validateDigestSelection(
        "2026-08-13",
        [selectionArticle({ publishedDate: "2026-08-13", impactAxis: "practice" })],
        true,
      ),
    /must be published between/,
  );
});

test("validateDigestSelection は practice / learning の欠落を拒否する", () => {
  assert.throws(
    () =>
      validateDigestSelection(
        "2026-08-13",
        [selectionArticle({ publishedDate: "2026-08-08" }), selectionArticle({ publishedDate: "2026-08-09", impactAxis: "risk" })],
        true,
      ),
    /at least one article whose impact_axis is practice or learning/,
  );
});

test("validateDigestSelection は learning でも最低枠を満たす", () => {
  validateDigestSelection(
    "2026-08-13",
    [selectionArticle({ publishedDate: "2026-08-08", impactAxis: "learning" })],
    true,
  );
});

test("validateDigestSelection は窓内に該当記事がなければ最低枠を適用しない", () => {
  validateDigestSelection(
    "2026-08-13",
    [selectionArticle({ publishedDate: "2026-08-08" })],
    false,
  );
});
