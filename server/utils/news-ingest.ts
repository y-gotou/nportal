import { createError } from "h3";
import type { D1DatabaseLike, NewsGlossaryTerm } from "../../types/portal.ts";
import { NEWS_IMPACT_AXES } from "./news.ts";

export const NEWS_CATEGORIES = ["プロダクト", "規制・リスク", "研究", "事例"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TERM_MARKER_PATTERN = /\[\[([^\]]+)\]\]/g;
// 記事の識別に関係しない計測用パラメータのみ除去する
const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_(cid|eid)$|ref$|ref_src$)/;

export interface IngestArticle {
  url: string;
  title: string;
  source: string;
  category: string;
  impactAxis: string;
  tags: string[];
  summary: string;
  whyImportant: string;
  glossary: NewsGlossaryTerm[];
  aiScore: number;
  articleDate: string | null;
}

function invalid(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message });
}

// クエリ全体を捨てると記事IDを含む URL を壊すため、計測用パラメータのみ除去する
export function normalizeUrl(rawUrl: string): string {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    invalid(`url is not a valid URL: ${rawUrl}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    invalid(`url must be http(s): ${rawUrl}`);
  }

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    invalid(`${field} is required.`);
  }
  if (value.length > maxLength) {
    invalid(`${field} must be ${maxLength} characters or fewer.`);
  }
  return value.trim();
}

function requireStringArray(value: unknown, field: string, maxItems: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    invalid(`${field} must be an array of strings.`);
  }
  if (value.length > maxItems) {
    invalid(`${field} must have ${maxItems} items or fewer.`);
  }
  return (value as string[]).map((item) => item.trim()).filter(Boolean);
}

function requireGlossary(value: unknown): NewsGlossaryTerm[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) invalid("glossary must be an array.");
  if (value.length > 5) invalid("glossary must have 5 items or fewer.");

  return value.map((item) => {
    const entry = item as Partial<NewsGlossaryTerm>;
    return {
      term: requireString(entry?.term, "glossary[].term", 60),
      description: requireString(entry?.description, "glossary[].description", 200),
    };
  });
}

export function requireDate(value: unknown, field: string): string {
  const date = requireString(value, field, 10);
  if (!DATE_PATTERN.test(date)) invalid(`${field} must be in YYYY-MM-DD format.`);
  return date;
}

export function jstToday(now: number = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// routine のクラウド環境は UTC で動くため、UTC 日付をそのまま書くと JST の前日になる。
// 掲載日は受信時点の JST 当日との一致を必須とし、誤日付の掲載をサーバ側で阻止する。
export function requireCurrentJstDate(value: unknown, field: string, now?: number): string {
  const date = requireDate(value, field);
  const today = jstToday(now);
  if (date !== today) {
    invalid(`${field} must be today in JST (${today}), got: ${date}`);
  }
  return date;
}

export function parseIngestArticle(raw: unknown): IngestArticle {
  const input = raw as Record<string, unknown>;

  const category = requireString(input?.category, "category", 20);
  if (!NEWS_CATEGORIES.includes(category)) {
    invalid(`category must be one of: ${NEWS_CATEGORIES.join(" / ")}`);
  }

  const impactAxis = requireString(input?.impact_axis, "impact_axis", 20);
  if (!NEWS_IMPACT_AXES.includes(impactAxis as (typeof NEWS_IMPACT_AXES)[number])) {
    invalid(`impact_axis must be one of: ${NEWS_IMPACT_AXES.join(" / ")}`);
  }

  const aiScore = Number(input?.ai_score);
  if (!Number.isInteger(aiScore) || aiScore < 0 || aiScore > 100) {
    invalid("ai_score must be an integer between 0 and 100.");
  }

  const summary = requireString(input?.summary, "summary", 400);
  const glossary = requireGlossary(input?.glossary);

  // 用語注の付け忘れを検出する
  const terms = new Set(glossary.map((entry) => entry.term));
  for (const [, term] of summary.matchAll(TERM_MARKER_PATTERN)) {
    if (!terms.has(term!)) {
      invalid(`summary marks [[${term}]] but glossary has no matching term.`);
    }
  }

  return {
    url: normalizeUrl(requireString(input?.url, "url", 500)),
    title: requireString(input?.title, "title", 200),
    source: requireString(input?.source, "source", 60),
    category,
    impactAxis,
    tags: requireStringArray(input?.tags, "tags", 8),
    summary,
    whyImportant: requireString(input?.why_important, "why_important", 200),
    glossary,
    aiScore,
    articleDate: input?.article_date ? requireDate(input.article_date, "article_date") : null,
  };
}

export interface IngestResult {
  inserted: number;
  skipped: number;
}

// 既存レコードは削除しない。投票が紐づくため、再投入は URL 重複のスキップで冪等にする。
export async function insertNewsArticles(
  db: D1DatabaseLike,
  publishedDate: string,
  articles: IngestArticle[],
): Promise<IngestResult> {
  let inserted = 0;

  for (const article of articles) {
    const existing = await db
      .prepare("SELECT id FROM news_articles WHERE url = ?")
      .bind(article.url)
      .first<{ id: number }>();

    if (existing) continue;

    await db
      .prepare(
        `INSERT INTO news_articles
           (published_date, url, title, source, category, impact_axis, tags, summary,
            why_important, glossary, ai_score, article_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        publishedDate,
        article.url,
        article.title,
        article.source,
        article.category,
        article.impactAxis,
        JSON.stringify(article.tags),
        article.summary,
        article.whyImportant,
        JSON.stringify(article.glossary),
        article.aiScore,
        article.articleDate,
      )
      .first();

    inserted += 1;
  }

  return { inserted, skipped: articles.length - inserted };
}

export interface DigestResult {
  articleIds: number[];
  missingUrls: string[];
}

// 週次は既存記事の再掲のため、URL から記事 ID を解決して並び順ごと保存する
export async function saveNewsDigest(
  db: D1DatabaseLike,
  publishedDate: string,
  overview: string,
  articleUrls: string[],
): Promise<DigestResult> {
  const articleIds: number[] = [];
  const missingUrls: string[] = [];

  for (const rawUrl of articleUrls) {
    const url = normalizeUrl(rawUrl);
    const row = await db
      .prepare("SELECT id FROM news_articles WHERE url = ? AND hidden_at IS NULL")
      .bind(url)
      .first<{ id: number }>();

    if (row) {
      articleIds.push(row.id);
    } else {
      missingUrls.push(url);
    }
  }

  await db
    .prepare(
      `INSERT INTO news_digests (published_date, overview, article_ids) VALUES (?, ?, ?)
       ON CONFLICT(published_date)
       DO UPDATE SET overview = excluded.overview, article_ids = excluded.article_ids`,
    )
    .bind(publishedDate, overview, JSON.stringify(articleIds))
    .first();

  return { articleIds, missingUrls };
}
