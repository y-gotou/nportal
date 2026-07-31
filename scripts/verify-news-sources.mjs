// AI ニュース機能のフェーズ0検証: 収集元・Tavily・nportal API への到達性を確認する。
// Claude のクラウドタスク(routine)環境で実行し、許可ドメイン設定の過不足を洗い出す用途。
//
// 使い方: node scripts/verify-news-sources.mjs
// 任意の環境変数:
//   TAVILY_API_KEY                Tavily 検索の到達性を確認する
//   NPORTAL_BASE_URL              nportal の到達性を確認する (例: https://example.pages.dev)
//   NPORTAL_CF_ACCESS_CLIENT_ID   Cloudflare Access サービストークン
//   NPORTAL_CF_ACCESS_CLIENT_SECRET

import { FEEDS } from "./news-feeds.mjs";

const TIMEOUT_MS = 15000;
const results = [];

function record(category, name, ok, detail) {
  results.push({ category, name, ok, detail });
  console.log(`${ok ? "OK  " : "NG  "} [${category}] ${name}: ${detail}`);
}

async function fetchWithTimeout(url, init) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

// クラウド環境で許可ドメイン外に出た場合は 403 + x-deny-reason: host_not_allowed が返る
function denyReason(response) {
  const reason = response.headers.get("x-deny-reason");
  return reason ? ` (x-deny-reason: ${reason})` : "";
}

async function checkFeeds() {
  for (const { name, url } of FEEDS) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: { "user-agent": "nportal-news-bot" },
      });
      const body = response.ok ? await response.text() : "";
      const items = (body.match(/<item[\s>]|<entry[\s>]/g) ?? []).length;
      record(
        "feed",
        name,
        response.ok && items > 0,
        `HTTP ${response.status}, items=${items}${denyReason(response)}`,
      );
    } catch (error) {
      record("feed", name, false, `${error.name}: ${error.message}`);
    }
  }
}

async function checkTavily() {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    record("tavily", "api.tavily.com", false, "SKIP: TAVILY_API_KEY 未設定");
    return;
  }
  try {
    const response = await fetchWithTimeout("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: "AI ニュース",
        max_results: 1,
        days: 7,
      }),
    });
    const body = response.ok ? await response.json() : null;
    record(
      "tavily",
      "api.tavily.com",
      response.ok,
      `HTTP ${response.status}, results=${body?.results?.length ?? 0}${denyReason(response)}`,
    );
  } catch (error) {
    record("tavily", "api.tavily.com", false, `${error.name}: ${error.message}`);
  }
}

async function checkNportal() {
  const baseUrl = process.env.NPORTAL_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    record("nportal", "API", false, "SKIP: NPORTAL_BASE_URL 未設定");
    return;
  }
  const clientId = process.env.NPORTAL_CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = process.env.NPORTAL_CF_ACCESS_CLIENT_SECRET?.trim();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/me`, {
      redirect: "manual",
      headers:
        clientId && clientSecret
          ? {
              "CF-Access-Client-Id": clientId,
              "CF-Access-Client-Secret": clientSecret,
            }
          : {},
    });
    // 200/401 は Access を通過してアプリまで届いた証拠。302/403 は Access で止められている。
    const reachedApp = response.status === 200 || response.status === 401;
    record(
      "nportal",
      "GET /api/me",
      reachedApp,
      `HTTP ${response.status}${reachedApp ? " (アプリまで到達)" : " (Access で遮断)"}${denyReason(response)}`,
    );
  } catch (error) {
    record("nportal", "API", false, `${error.name}: ${error.message}`);
  }
}

await checkFeeds();
await checkTavily();
await checkNportal();

const failed = results.filter((r) => !r.ok);
console.log(`\n--- 結果: ${results.length - failed.length}/${results.length} 件 OK ---`);
if (failed.length) {
  console.log("要対応:");
  for (const f of failed) console.log(`  - [${f.category}] ${f.name}: ${f.detail}`);
}
