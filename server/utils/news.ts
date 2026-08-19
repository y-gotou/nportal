import type {
  D1DatabaseLike,
  NewsArticle,
  NewsDigest,
  NewsGlossaryTerm,
  NewsImpactAxis,
  NewsVoteValue,
} from "../../types/portal.ts";
import { parseStringArray } from "../../shared/utils/json.ts";

// 掲載後の並び順: final_score = ai_score + VOTE_COEFFICIENT × (👍 − 👎)
export const VOTE_COEFFICIENT = 4;

export const NEWS_IMPACT_AXES: NewsImpactAxis[] = [
  "tooling",
  "risk",
  "practice",
  "learning",
  "landscape",
];

export interface AdjacentDates {
  prevDate: string | null;
  nextDate: string | null;
}

interface ArticleRow {
  id: number;
  published_date: string;
  url: string;
  title: string;
  source: string;
  category: string;
  impact_axis: string;
  tags: string;
  summary: string;
  why_important: string;
  glossary: string;
  ai_score: number;
  article_date: string | null;
  up_count: number;
  down_count: number;
  my_vote: number;
}

const ARTICLE_SELECT = `
  SELECT
    a.id, a.published_date, a.url, a.title, a.source, a.category, a.impact_axis,
    a.tags, a.summary, a.why_important, a.glossary, a.ai_score, a.article_date,
    COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS up_count,
    COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS down_count,
    COALESCE(MAX(CASE WHEN v.user_email = ? THEN v.value END), 0) AS my_vote
  FROM news_articles a
  LEFT JOIN news_votes v ON v.article_id = a.id
`;

function parseGlossary(value: string | null | undefined): NewsGlossaryTerm[] {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NewsGlossaryTerm =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as NewsGlossaryTerm).term === "string" &&
        typeof (item as NewsGlossaryTerm).description === "string",
    );
  } catch {
    return [];
  }
}

function toImpactAxis(value: string): NewsImpactAxis {
  return NEWS_IMPACT_AXES.includes(value as NewsImpactAxis)
    ? (value as NewsImpactAxis)
    : "landscape";
}

function toVoteValue(value: number): NewsVoteValue {
  if (value === 1) return 1;
  if (value === -1) return -1;
  return 0;
}

function toArticle(row: ArticleRow): NewsArticle {
  const upCount = Number(row.up_count);
  const downCount = Number(row.down_count);

  return {
    id: row.id,
    publishedDate: row.published_date,
    url: row.url,
    title: row.title,
    source: row.source,
    category: row.category,
    impactAxis: toImpactAxis(row.impact_axis),
    tags: parseStringArray(row.tags),
    summary: row.summary,
    whyImportant: row.why_important,
    glossary: parseGlossary(row.glossary),
    aiScore: row.ai_score,
    articleDate: row.article_date,
    upCount,
    downCount,
    myVote: toVoteValue(Number(row.my_vote)),
    finalScore: row.ai_score + VOTE_COEFFICIENT * (upCount - downCount),
  };
}

// 並び替えは件数が少ないためアプリ側で行い、スコア式を 1 か所に集約する
function byFinalScore(a: NewsArticle, b: NewsArticle) {
  return b.finalScore - a.finalScore || b.aiScore - a.aiScore || a.id - b.id;
}

// 掲載日は日々増えるため一覧は返さず、指定日を実在する掲載日へ解決して前後だけを返す。
// 指定日に掲載がない場合は直前の掲載日にフォールバックする。
export async function resolveNewsDate(
  db: D1DatabaseLike,
  requestedDate: string | undefined,
): Promise<string | null> {
  const row = requestedDate
    ? await db
        .prepare(
          "SELECT MAX(published_date) AS date FROM news_articles WHERE published_date <= ? AND hidden_at IS NULL",
        )
        .bind(requestedDate)
        .first<{ date: string | null }>()
    : await db
        .prepare(
          "SELECT MAX(published_date) AS date FROM news_articles WHERE hidden_at IS NULL",
        )
        .first<{ date: string | null }>();

  return row?.date ?? null;
}

// 掲載時刻(最終更新)は当日分の投入時刻の最大値とする
export async function getNewsUpdatedAt(
  db: D1DatabaseLike,
  date: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT MAX(created_at) AS updated_at FROM news_articles WHERE published_date = ? AND hidden_at IS NULL",
    )
    .bind(date)
    .first<{ updated_at: string | null }>();

  return row?.updated_at ?? null;
}

export async function getAdjacentNewsDates(
  db: D1DatabaseLike,
  date: string,
): Promise<AdjacentDates> {
  const [prev, next] = await Promise.all([
    db
      .prepare(
        "SELECT MAX(published_date) AS date FROM news_articles WHERE published_date < ? AND hidden_at IS NULL",
      )
      .bind(date)
      .first<{ date: string | null }>(),
    db
      .prepare(
        "SELECT MIN(published_date) AS date FROM news_articles WHERE published_date > ? AND hidden_at IS NULL",
      )
      .bind(date)
      .first<{ date: string | null }>(),
  ]);

  return { prevDate: prev?.date ?? null, nextDate: next?.date ?? null };
}

export async function listNewsArticles(
  db: D1DatabaseLike,
  date: string,
  userEmail: string,
): Promise<NewsArticle[]> {
  const { results } = await db
    .prepare(
      `${ARTICLE_SELECT} WHERE a.published_date = ? AND a.hidden_at IS NULL GROUP BY a.id`,
    )
    .bind(userEmail, date)
    .all<ArticleRow>();

  return results.map(toArticle).sort(byFinalScore);
}

export async function getNewsDigest(
  db: D1DatabaseLike,
  requestedDate: string | undefined,
  userEmail: string,
): Promise<NewsDigest | null> {
  const digest = requestedDate
    ? await db
        .prepare(
          "SELECT published_date, overview, article_ids FROM news_digests WHERE published_date <= ? ORDER BY published_date DESC LIMIT 1",
        )
        .bind(requestedDate)
        .first<{ published_date: string; overview: string; article_ids: string }>()
    : await db
        .prepare(
          "SELECT published_date, overview, article_ids FROM news_digests ORDER BY published_date DESC LIMIT 1",
        )
        .first<{ published_date: string; overview: string; article_ids: string }>();

  if (!digest) {
    return null;
  }

  const articleIds = (() => {
    try {
      const parsed = JSON.parse(digest.article_ids ?? "[]") as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((id): id is number => Number.isInteger(id))
        : [];
    } catch {
      return [];
    }
  })();

  if (!articleIds.length) {
    return { publishedDate: digest.published_date, overview: digest.overview, articles: [] };
  }

  const placeholders = articleIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `${ARTICLE_SELECT} WHERE a.id IN (${placeholders}) AND a.hidden_at IS NULL GROUP BY a.id`,
    )
    .bind(userEmail, ...articleIds)
    .all<ArticleRow>();

  const byId = new Map(results.map((row) => [row.id, toArticle(row)]));

  return {
    publishedDate: digest.published_date,
    overview: digest.overview,
    // 週次の順位は生成時点で確定しているため、保存された ID の並びを維持する
    articles: articleIds
      .map((id) => byId.get(id))
      .filter((article): article is NewsArticle => Boolean(article)),
  };
}

export interface NewsVoteCounts {
  upCount: number;
  downCount: number;
  myVote: NewsVoteValue;
}

export async function newsArticleExists(
  db: D1DatabaseLike,
  articleId: number,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM news_articles WHERE id = ? AND hidden_at IS NULL")
    .bind(articleId)
    .first<{ id: number }>();

  return Boolean(row);
}

// 1 ユーザー 1 記事 1 票。value が 0 のときは取り消しとして削除する。
export async function saveNewsVote(
  db: D1DatabaseLike,
  articleId: number,
  userEmail: string,
  value: NewsVoteValue,
): Promise<NewsVoteCounts> {
  if (value === 0) {
    await db
      .prepare("DELETE FROM news_votes WHERE article_id = ? AND user_email = ?")
      .bind(articleId, userEmail)
      .first();
  } else {
    await db
      .prepare(
        `INSERT INTO news_votes (article_id, user_email, value) VALUES (?, ?, ?)
         ON CONFLICT(article_id, user_email)
         DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      )
      .bind(articleId, userEmail, value)
      .first();
  }

  const row = await db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS up_count,
         COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS down_count
       FROM news_votes WHERE article_id = ?`,
    )
    .bind(articleId)
    .first<{ up_count: number; down_count: number }>();

  return {
    upCount: Number(row?.up_count ?? 0),
    downCount: Number(row?.down_count ?? 0),
    myVote: value,
  };
}

export async function getAdjacentDigestDates(
  db: D1DatabaseLike,
  date: string,
): Promise<AdjacentDates> {
  const [prev, next] = await Promise.all([
    db
      .prepare(
        "SELECT MAX(published_date) AS date FROM news_digests WHERE published_date < ?",
      )
      .bind(date)
      .first<{ date: string | null }>(),
    db
      .prepare(
        "SELECT MIN(published_date) AS date FROM news_digests WHERE published_date > ?",
      )
      .bind(date)
      .first<{ date: string | null }>(),
  ]);

  return { prevDate: prev?.date ?? null, nextDate: next?.date ?? null };
}
