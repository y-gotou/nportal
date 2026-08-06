// 日次ニュースの候補収集。RSS と Tavily から候補を集め、評価傾向と併せて JSON で出力する。
// 選定・要約・スコアリングは routine 内の Claude が行うため、このスクリプトは判断をしない。
//
// 使い方:
//   node scripts/news-collect.mjs <base-url> [--days N] [--out candidates.json] [--force]
//
// --days を省略すると、直近の掲載日以降に公開された記事を対象にする。
// 前日に評価して落とした候補を翌日以降も読み直す無駄を避けるため。
//
// 必要な環境変数:
//   NEWS_INGEST_TOKEN / NPORTAL_CF_ACCESS_CLIENT_ID / NPORTAL_CF_ACCESS_CLIENT_SECRET
//   TAVILY_API_KEY（未設定なら Web 検索を省略する）
//
// 掲載済み URL は feedback.recent_articles（直近14日）から除外する。

import { writeFileSync } from "node:fs";
import { FEEDS, looksAiRelated } from "./news-feeds.mjs";
import { normalizeUrl, parseFeed } from "./news-parse.mjs";

const [, , baseUrlArg, ...flags] = process.argv;

function flagValue(name, fallback) {
  const index = flags.indexOf(name);
  return index >= 0 && flags[index + 1] ? flags[index + 1] : fallback;
}

if (!baseUrlArg) {
  console.error("Usage: node scripts/news-collect.mjs <base-url> [--days N] [--out path] [--force]");
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/$/, "");
const daysFlag = flags.includes("--days") ? Number(flagValue("--days", "1")) : null;
const outPath = flagValue("--out", "");
const force = flags.includes("--force");

// 収集期間の上限。長期間の停止後に候補が膨らみすぎるのを防ぐ。
const MAX_WINDOW_DAYS = 7;
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

const warnings = [];

function jstToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 直近の掲載日の 00:00 JST 以降を対象にする。掲載済み URL は別途除外されるため重複はしない。
// これにより、実行が飛んだ日や休日明けも自動的に取りこぼしなく拾える。
function resolveSince(recentArticles) {
  if (daysFlag) {
    return new Date(Date.now() - daysFlag * 24 * 60 * 60 * 1000);
  }

  const latest = recentArticles[0]?.published_date;
  const limit = new Date(Date.now() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  if (!latest) return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const from = new Date(`${latest}T00:00:00+09:00`);
  return from < limit ? limit : from;
}

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

// フィードは 5xx やタイムアウトの一時障害を起こすことがあるため、失敗時は少し待って 1 回だけ再試行する。
async function fetchFeedText(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "nportal-news-bot" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt >= 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function collectFromFeeds(publishedUrls, since) {
  const candidates = [];

  const perFeed = await Promise.all(
    FEEDS.map(async ({ name, url, aiOnly }) => {
      try {
        return { source: name, aiOnly, entries: parseFeed(await fetchFeedText(url)) };
      } catch (error) {
        warnings.push(`feed ${name}: ${error.message}`);
        return { source: name, aiOnly, entries: [] };
      }
    }),
  );

  // ITmedia AI+ と ITmedia NEWS のように、同一記事が複数フィードへ流れることがある
  const seenInFeeds = new Set();

  for (const { source, aiOnly, entries } of perFeed) {
    for (const entry of entries) {
      // 公開日が取れないフィードは新着判定ができないため、対象から外す
      if (!entry.publishedAt || entry.publishedAt < since) continue;

      // 総合 IT メディアは AI 以外の記事も流れるため、関連語で絞る
      if (!aiOnly && !looksAiRelated(`${entry.title} ${entry.body}`)) continue;

      const url = normalizeUrl(entry.url);
      if (publishedUrls.has(url) || seenInFeeds.has(url)) continue;
      seenInFeeds.add(url);

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

// 一次ドメインはハブ・製品・ドキュメントページが混ざるため、個別記事のパスに限定する
const PRIMARY_ARTICLE_PATHS = new Map([
  ["anthropic.com", ["/news/", "/research/", "/engineering/"]],
  ["ai.meta.com", ["/blog/"]],
]);

function isArticleUrl(url) {
  const { hostname, pathname } = new URL(url);
  if (pathname === "/") return false;
  const host = hostname.replace(/^www\./, "");
  for (const [domain, prefixes] of PRIMARY_ARTICLE_PATHS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return prefixes.some((prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length);
    }
  }
  return true;
}

async function collectFromSearch(publishedUrls, seenUrls, since) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    warnings.push("TAVILY_API_KEY 未設定のため Web 検索を省略しました");
    return [];
  }

  const startDate = new Date(since.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // RSS を公開していない提供元（Anthropic / Meta AI）の取りこぼしを補う。
  // 報道は topic: "news"（published_date 付き、start_date で新着に限定）で拾い、
  // 一次ページは include_domains で直接引く。一次ページは日付メタデータを持たないため
  // time_range で近似的に絞り、isArticleUrl でハブページを除外する。
  const requests = [
    { query: "Anthropic Claude 最新発表", topic: "news", start_date: startDate },
    { query: "Meta AI 最新発表", topic: "news", start_date: startDate },
    { query: "生成AI 導入 企業 発表", topic: "news", start_date: startDate },
    { query: "Claude 発表", include_domains: ["anthropic.com"], time_range: "week" },
    { query: "Meta AI 発表", include_domains: ["ai.meta.com"], time_range: "week" },
  ];

  const results = await Promise.all(
    requests.map(async ({ query, ...params }) => {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ query, max_results: 5, ...params }),
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
    if (!url || publishedUrls.has(url) || seenUrls.has(url) || !isArticleUrl(url)) continue;

    const parsedDate = result.published_date ? new Date(result.published_date) : null;
    const publishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    if (publishedAt && publishedAt < since) continue;

    seenUrls.add(url);

    candidates.push({
      source: new URL(url).hostname.replace(/^www\./, ""),
      url,
      title: result.title ?? "",
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      body: (result.content ?? "").slice(0, 800),
      origin: "search",
    });
  }

  return candidates;
}

const feedback = await fetchFeedbackSummary();
const recentArticles = feedback.recent_articles ?? [];

// 当日分が掲載済みなら、選定と執筆に入る前に終了する（重複発火での二重掲載を防ぐ）
const today = jstToday();
const publishedToday = recentArticles.filter((a) => a.published_date === today).length;

if (publishedToday > 0 && !force) {
  console.log(
    `本日（${today}）分は掲載済みです（${publishedToday} 件）。掲載をスキップします。` +
      "\n意図的に追加する場合は --force を付けて再実行してください。",
  );
  process.exit(0);
}

const publishedUrls = new Set(recentArticles.map((article) => normalizeUrl(article.url)));
const since = resolveSince(recentArticles);

const feedCandidates = await collectFromFeeds(publishedUrls, since);
const seenUrls = new Set(feedCandidates.map((candidate) => candidate.url));
const searchCandidates = await collectFromSearch(publishedUrls, seenUrls, since);

const output = {
  collectedAt: new Date().toISOString(),
  publishDate: today,
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
