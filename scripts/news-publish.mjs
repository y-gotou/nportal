// 生成した掲載データを取り込み API へ投入する。
//
// 使い方:
//   node scripts/news-publish.mjs <base-url> <payload.json>
//
// 必要な環境変数:
//   NEWS_INGEST_TOKEN / NPORTAL_CF_ACCESS_CLIENT_ID / NPORTAL_CF_ACCESS_CLIENT_SECRET

import { readFileSync } from "node:fs";

const [, , baseUrlArg, payloadPath] = process.argv;

if (!baseUrlArg || !payloadPath) {
  console.error("Usage: node scripts/news-publish.mjs <base-url> <payload.json>");
  process.exit(1);
}

const token = process.env.NEWS_INGEST_TOKEN?.trim();

if (!token) {
  console.error("Missing required environment variable: NEWS_INGEST_TOKEN");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));

const response = await fetch(`${baseUrlArg.replace(/\/$/, "")}/api/news/ingest`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    "CF-Access-Client-Id": process.env.NPORTAL_CF_ACCESS_CLIENT_ID?.trim() ?? "",
    "CF-Access-Client-Secret": process.env.NPORTAL_CF_ACCESS_CLIENT_SECRET?.trim() ?? "",
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30000),
});

const text = await response.text();
console.log(`HTTP ${response.status}`);
console.log(text);

// 取り込みに失敗したら routine 側で失敗と分かるようにする
if (!response.ok) process.exit(1);
