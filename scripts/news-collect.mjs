// 日次ニュースの候補収集。RSS と Tavily から候補を集め、評価傾向と併せて JSON で出力する。
// 選定・要約・スコアリングは routine 内の Claude が行うため、このスクリプトは判断をしない。
//
// 使い方:
//   node scripts/news-collect.mjs <base-url> [--days 1] [--out candidates.json]
//
// 必要な環境変数:
//   NEWS_INGEST_TOKEN / NPORTAL_CF_ACCESS_CLIENT_ID / NPORTAL_CF_ACCESS_CLIENT_SECRET
//   TAVILY_API_KEY（未設定なら Web 検索を省略する）
//
// 掲載済み URL は feedback.recent_articles（直近14日）から除外する。

import { writeFileSync } from "node:fs";
import { FEEDS } from "./news-feeds.mjs";
import { normalizeUrl, parseFeed } from "./news-parse.mjs";

const [, , baseUrlArg, ...flags] = process.argv;

function flagValue(name, fallback) {
  const index = flags.indexOf(name);
  return index >= 0 && flags[index + 1] ? flags[index + 1] : fallback;
}

if (!baseUrlArg) {
  console.error("Usage: node scripts/news-collect.mjs <base-url> [--days 1] [--out path]");
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/$/, "");
const days = Number(flagValue("--days", "1"));
const outPath = flagValue("--out", "");
const token = process.env.NEWS_INGEST_TOKEN?.trim();

if (!token) {
  console.error("Missing required environment variable: NEWS_INGEST_TOKEN");
  process.exit(1);
}

const apiHeaders = {
  authorization: `Bearer ${token}`,
  "CF-Access-Client-Id": process.env.NPORTAL_CF_ACCESS_CLIENT_ID?.trim() ?? "",
  "CF-Access-Client-Secret": process.env.NPORTAL_CF_ACCESS_CLIENT_SECRET?.trim() ?? "",
};

const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const warnings = [];

async function fetchFeedbackSummary() {
  const response = await fetch(`${baseUrl}/api/news/feedback-summary`, {
    headers: apiHeaders,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`feedback-summary returned ${response.status}`);
  }

  return response.json();
}

async function collectFromFeeds(publishedUrls) {
  const candidates = [];

  const perFeed = await Promise.all(
    FEEDS.map(async ([source, url]) => {
      try {
        const response = await fetch(url, {
          headers: { "user-agent": "nportal-news-bot" },
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return { source, entries: parseFeed(await response.text()) };
      } catch (error) {
        warnings.push(`feed ${source}: ${error.message}`);
        return { source, entries: [] };
      }
    }),
  );

  for (const { source, entries } of perFeed) {
    for (const entry of entries) {
      // 公開日が取れないフィードは新着判定ができないため、対象から外す
      if (!entry.publishedAt || entry.publishedAt < since) continue;

      const url = normalizeUrl(entry.url);
      if (publishedUrls.has(url)) continue;

      candidates.push({
        source,
        url,
        title: entry.title,
        publishedAt: entry.publishedAt.toISOString(),
        body: entry.body,
        origin: "feed",
      });
    }
  }

  return candidates;
}

async function collectFromSearch(publishedUrls, seenUrls) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    warnings.push("TAVILY_API_KEY 未設定のため Web 検索を省略しました");
    return [];
  }

  // RSS を公開していない提供元（Anthropic / Meta AI）の取りこぼしを補う
  const queries = [
    "Anthropic Claude 最新発表",
    "Meta AI 最新発表",
    "生成AI 企業 導入事例 最新",
  ];

  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, query, max_results: 5, days }),
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        return json.results ?? [];
      } catch (error) {
        warnings.push(`tavily "${query}": ${error.message}`);
        return [];
      }
    }),
  );

  const candidates = [];

  for (const result of results.flat()) {
    const url = normalizeUrl(result.url ?? "");
    if (!url || publishedUrls.has(url) || seenUrls.has(url)) continue;
    seenUrls.add(url);

    candidates.push({
      source: new URL(url).hostname.replace(/^www\./, ""),
      url,
      title: result.title ?? "",
      publishedAt: result.published_date ?? null,
      body: (result.content ?? "").slice(0, 800),
      origin: "search",
    });
  }

  return candidates;
}

const feedback = await fetchFeedbackSummary();
const publishedUrls = new Set(
  (feedback.recent_articles ?? []).map((article) => normalizeUrl(article.url)),
);

const feedCandidates = await collectFromFeeds(publishedUrls);
const seenUrls = new Set(feedCandidates.map((candidate) => candidate.url));
const searchCandidates = await collectFromSearch(publishedUrls, seenUrls);

const output = {
  collectedAt: new Date().toISOString(),
  since: since.toISOString(),
  feedback,
  candidates: [...feedCandidates, ...searchCandidates],
  warnings,
};

const json = JSON.stringify(output, null, 2);

if (outPath) {
  writeFileSync(outPath, json);
  console.log(
    `候補 ${output.candidates.length} 件（フィード ${feedCandidates.length} / 検索 ${searchCandidates.length}）を ${outPath} に出力しました`,
  );
  if (warnings.length) console.log(`警告 ${warnings.length} 件:\n  ${warnings.join("\n  ")}`);
} else {
  console.log(json);
}
