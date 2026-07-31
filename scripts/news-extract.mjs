// 本文が取れなかった候補の本文を Tavily の抽出 API から取得する。
// Tavily 側が本文を取りに行くため、収集元以外のドメインを許可リストに追加せずに済む。
//
// 使い方:
//   node scripts/news-extract.mjs <out.json> <url> [url...]
//
// 必要な環境変数:
//   TAVILY_API_KEY
//
// 選定前に全候補を投げるとクレジットを無駄にするため、
// 選定後に本文が不足しているものだけを渡すこと（docs/news-routine.md 参照）。

import { writeFileSync } from "node:fs";

const [, , outPath, ...urls] = process.argv;

// Tavily の 1 リクエストあたりの上限
const MAX_URLS = 20;
const MAX_CONTENT_LENGTH = 4000;

if (!outPath || urls.length === 0) {
  console.error("Usage: node scripts/news-extract.mjs <out.json> <url> [url...]");
  process.exit(1);
}

if (urls.length > MAX_URLS) {
  console.error(`URL は ${MAX_URLS} 件までです（指定: ${urls.length} 件）`);
  process.exit(1);
}

const apiKey = process.env.TAVILY_API_KEY?.trim();

if (!apiKey) {
  console.error("Missing required environment variable: TAVILY_API_KEY");
  process.exit(1);
}

const response = await fetch("https://api.tavily.com/extract", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ api_key: apiKey, urls }),
  signal: AbortSignal.timeout(60000),
});

if (!response.ok) {
  console.error(`tavily extract returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
  process.exit(1);
}

const json = await response.json();

const extracted = (json.results ?? []).map((result) => ({
  url: result.url,
  content: (result.raw_content ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CONTENT_LENGTH),
}));

const failed = (json.failed_results ?? []).map((result) => result.url ?? String(result));

writeFileSync(outPath, JSON.stringify({ extracted, failed }, null, 2));

console.log(`本文を取得: ${extracted.length} 件 / 失敗: ${failed.length} 件 → ${outPath}`);
for (const entry of extracted) {
  console.log(`  ${entry.content.length} 字  ${entry.url}`);
}
for (const url of failed) {
  console.log(`  取得できず  ${url}`);
}
