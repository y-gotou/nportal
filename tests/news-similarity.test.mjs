import assert from "node:assert/strict";
import test from "node:test";
import {
  SIMILARITY_THRESHOLD,
  findSimilarTitles,
  titleSimilarity,
} from "../scripts/news-similarity.mjs";

// 2026-08 の第 1 週に実際に二重掲載された 3 組をフィクスチャにする。
// 要件上の検出目標は EU 規制と SQLite 偽 CVE の 2 組(Skill Recorder 組は語彙の重なりが少なく、検出漏れを許容)。
const EU_PAIR = [
  "EU、AIが生成・加工したコンテンツへの識別表示を8月2日から義務化",
  "EU、AI生成コンテンツへのラベル表示義務の適用を開始 違反に最大1500万ユーロ",
];
const SQLITE_PAIR = [
  "SQLiteの「重大な脆弱性」報告はAI生成の偽物だった JFrogが検証",
  "SQLiteの「存在しない脆弱性」が大量登録 AI生成とみられる偽CVEをJFrogが検証",
];

test("同一話題のタイトル組は閾値以上になる", () => {
  assert.ok(titleSimilarity(...EU_PAIR) >= SIMILARITY_THRESHOLD);
  assert.ok(titleSimilarity(...SQLITE_PAIR) >= SIMILARITY_THRESHOLD);
});

test("無関係なタイトル組は閾値未満になる", () => {
  const similarity = titleSimilarity(
    "OpenAI、GPT-5.6のAPI価格を引き下げ Lunaは80%、Terraは20%安く",
    "Anthropic、評価中のClaudeが実在企業へ不正アクセスした3件を公表",
  );
  assert.ok(similarity < SIMILARITY_THRESHOLD, `similarity=${similarity}`);
});

test("findSimilarTitles は類似記事のみを返す", () => {
  const recent = [
    { url: "https://example.com/eu", title: EU_PAIR[0], published_date: "2026-08-02" },
    { url: "https://example.com/other", title: "Sakana AI、日本語特化LLM「Namazu」をAPIとして提供開始", published_date: "2026-08-04" },
  ];

  const similar = findSimilarTitles(EU_PAIR[1], recent);
  assert.deepEqual(
    similar.map((entry) => entry.url),
    ["https://example.com/eu"],
  );
});

test("findSimilarTitles は空タイトルで何も返さない", () => {
  assert.deepEqual(findSimilarTitles("", [{ url: "https://example.com/eu", title: EU_PAIR[0], published_date: "2026-08-02" }]), []);
});
