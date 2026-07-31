// フェーズ3の検証: ニュース連携API(取り込み・評価集計)の疎通と入力検証を確認する。
//
// 使い方:
//   node scripts/verify-news-api.mjs <base-url>            読み取りと400系のみ（DBを変更しない）
//   node scripts/verify-news-api.mjs <base-url> --write    取り込みも実行する（DBに書き込む）
//
// 必要な環境変数:
//   NEWS_INGEST_TOKEN               連携API用の Bearer トークン
//   NPORTAL_CF_ACCESS_CLIENT_ID     Cloudflare Access サービストークン
//   NPORTAL_CF_ACCESS_CLIENT_SECRET
//
// 接続先は引数で明示する（本番へ誤って書き込まないため、環境変数からは読まない）。

const [, , baseUrlArg, ...flags] = process.argv;
const allowWrite = flags.includes("--write");

if (!baseUrlArg) {
  console.error("Usage: node scripts/verify-news-api.mjs <base-url> [--write]");
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/$/, "");
const token = process.env.NEWS_INGEST_TOKEN?.trim();

if (!token) {
  console.error("Missing required environment variable: NEWS_INGEST_TOKEN");
  process.exit(1);
}

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${token}`,
  "CF-Access-Client-Id": process.env.NPORTAL_CF_ACCESS_CLIENT_ID?.trim() ?? "",
  "CF-Access-Client-Secret": process.env.NPORTAL_CF_ACCESS_CLIENT_SECRET?.trim() ?? "",
};

// 検証用データと分かるように example.com の URL を使う
const SAMPLE_DATE = "2026-07-31";
const SAMPLE_URL = "https://example.com/verify-news-api/1";

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "OK  " : "NG  "} ${name}: ${detail}`);
}

async function call(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // HTML が返る場合は Access で止められている
  }

  return { status: response.status, json, text };
}

function sampleArticle(overrides = {}) {
  return {
    url: SAMPLE_URL,
    title: "【検証】ニュース連携APIの疎通確認用データ",
    source: "検証",
    category: "プロダクト",
    impact_axis: "tooling",
    tags: ["検証"],
    summary: "[[疎通確認]]のために投入したデータです。表示確認後に削除してください。",
    why_important: "このデータは検証用のため、内容に意味はありません。",
    glossary: [{ term: "疎通確認", description: "経路が通っているかを確かめること。" }],
    ai_score: 50,
    article_date: SAMPLE_DATE,
    ...overrides,
  };
}

async function checkFeedbackSummary() {
  const { status, json, text } = await call("GET", "/api/news/feedback-summary");
  const shapeOk =
    status === 200 &&
    Boolean(json?.weights?.source) &&
    Boolean(json?.tags) &&
    Boolean(json?.study_group_context) &&
    Array.isArray(json?.published_urls);

  record(
    "GET /api/news/feedback-summary",
    shapeOk,
    shapeOk
      ? `HTTP 200, 掲載済みURL ${json.published_urls.length} 件`
      : `HTTP ${status}, ${text.slice(0, 120)}`,
  );
}

async function checkTokenRejection() {
  const response = await fetch(`${baseUrl}/api/news/feedback-summary`, {
    headers: { ...headers, authorization: "Bearer invalid-token" },
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });

  record(
    "不正なトークンを拒否する",
    response.status === 401,
    `HTTP ${response.status}（401 を期待）`,
  );
}

async function checkValidation() {
  const cases = [
    ["カテゴリが4分類以外", { category: "市場" }],
    ["観点が5分類以外", { impact_axis: "other" }],
    ["ai_score が範囲外", { ai_score: 120 }],
    ["用語注のない [[用語]]", { summary: "[[未定義語]]を含む本文。", glossary: [] }],
  ];

  for (const [name, overrides] of cases) {
    const { status, json } = await call("POST", "/api/news/ingest", {
      type: "daily",
      published_date: SAMPLE_DATE,
      articles: [sampleArticle(overrides)],
    });

    record(
      `400 を返す: ${name}`,
      status === 400,
      `HTTP ${status}${json?.statusMessage ? ` (${json.statusMessage})` : ""}`,
    );
  }
}

async function checkIngest() {
  const payload = {
    type: "daily",
    published_date: SAMPLE_DATE,
    articles: [sampleArticle()],
  };

  const first = await call("POST", "/api/news/ingest", payload);
  record(
    "POST /api/news/ingest (daily)",
    first.status === 200,
    `HTTP ${first.status}, inserted=${first.json?.inserted} skipped=${first.json?.skipped}`,
  );

  const second = await call("POST", "/api/news/ingest", payload);
  record(
    "同じURLの再投入はスキップされる",
    second.status === 200 && second.json?.inserted === 0 && second.json?.skipped === 1,
    `HTTP ${second.status}, inserted=${second.json?.inserted} skipped=${second.json?.skipped}`,
  );

  const weekly = await call("POST", "/api/news/ingest", {
    type: "weekly",
    published_date: SAMPLE_DATE,
    overview: "【検証】週次ダイジェストの疎通確認用データです。",
    article_urls: [SAMPLE_URL, "https://example.com/does-not-exist"],
  });
  record(
    "POST /api/news/ingest (weekly)",
    weekly.status === 200 &&
      weekly.json?.articleIds?.length === 1 &&
      weekly.json?.missingUrls?.length === 1,
    `HTTP ${weekly.status}, articleIds=${JSON.stringify(weekly.json?.articleIds)} missingUrls=${weekly.json?.missingUrls?.length}`,
  );
}

console.log(`接続先: ${baseUrl}（書き込み: ${allowWrite ? "あり" : "なし"}）\n`);

await checkFeedbackSummary();
await checkTokenRejection();
await checkValidation();

if (allowWrite) {
  await checkIngest();
} else {
  console.log("--  取り込みの実行は --write 指定時のみ行います");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n--- 結果: ${results.length - failed.length}/${results.length} 件 OK ---`);
if (failed.length) {
  console.log("要対応:");
  for (const f of failed) console.log(`  - ${f.name}`);
}
