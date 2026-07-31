import type { D1DatabaseLike } from "../../types/portal.ts";

// docs/requirements-news.md §7.2 の重み式
const WEIGHT_STRENGTH = 0.3;
const WEIGHT_SMOOTHING = 5;
const WEIGHT_MIN = 0.7;
const WEIGHT_MAX = 1.3;

const TAG_WINDOW_DAYS = 30;
const PUBLISHED_URL_WINDOW_DAYS = 14;
const TAG_LIMIT = 10;
const CONTEXT_LIMIT = 20;

interface ArticleStatsRow {
  source: string;
  category: string;
  impact_axis: string;
  tags: string;
  published_date: string;
  up_count: number;
  down_count: number;
}

interface Tally {
  up: number;
  down: number;
}

function tallyOf(map: Map<string, Tally>, key: string): Tally {
  const existing = map.get(key);
  if (existing) return existing;

  const created = { up: 0, down: 0 };
  map.set(key, created);
  return created;
}

function toWeight({ up, down }: Tally): number {
  const raw = 1 + (WEIGHT_STRENGTH * (up - down)) / (up + down + WEIGHT_SMOOTHING);
  return Number(Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, raw)).toFixed(3));
}

function toWeightMap(tallies: Map<string, Tally>): Record<string, number> {
  return Object.fromEntries([...tallies].map(([key, tally]) => [key, toWeight(tally)]));
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export interface FeedbackSummary {
  weights: {
    source: Record<string, number>;
    category: Record<string, number>;
    impact_axis: Record<string, number>;
  };
  tags: {
    liked: Array<{ tag: string; up: number; down: number }>;
    disliked: Array<{ tag: string; up: number; down: number }>;
  };
  study_group_context: {
    recent_topics: string[];
    resource_tags: string[];
    upcoming_sessions: string[];
  };
  published_urls: string[];
}

async function loadArticleStats(db: D1DatabaseLike): Promise<ArticleStatsRow[]> {
  const { results } = await db
    .prepare(
      `SELECT a.source, a.category, a.impact_axis, a.tags, a.published_date,
              COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS up_count,
              COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS down_count
       FROM news_articles a
       LEFT JOIN news_votes v ON v.article_id = a.id
       WHERE a.hidden_at IS NULL
       GROUP BY a.id`,
    )
    .all<ArticleStatsRow>();

  return results;
}

async function loadStudyGroupContext(db: D1DatabaseLike) {
  // 個人が特定される情報（応募者の email 等）は含めない
  const [minutes, resources, applications] = await Promise.all([
    db
      .prepare("SELECT topics FROM minutes ORDER BY date DESC LIMIT 5")
      .all<{ topics: string }>(),
    db
      .prepare("SELECT tags FROM resources WHERE date >= ?")
      .bind(daysAgo(TAG_WINDOW_DAYS))
      .all<{ tags: string }>(),
    db
      .prepare(
        `SELECT title FROM speaker_applications
         WHERE status IN ('pending', 'scheduled')
         ORDER BY created_at DESC LIMIT 10`,
      )
      .all<{ title: string }>(),
  ]);

  const unique = (values: string[]) => [...new Set(values)].slice(0, CONTEXT_LIMIT);

  return {
    recent_topics: unique(minutes.results.flatMap((row) => parseTags(row.topics))),
    resource_tags: unique(resources.results.flatMap((row) => parseTags(row.tags))),
    upcoming_sessions: applications.results.map((row) => row.title),
  };
}

export async function buildFeedbackSummary(db: D1DatabaseLike): Promise<FeedbackSummary> {
  const [stats, context, publishedUrls] = await Promise.all([
    loadArticleStats(db),
    loadStudyGroupContext(db),
    db
      .prepare("SELECT url FROM news_articles WHERE published_date >= ?")
      .bind(daysAgo(PUBLISHED_URL_WINDOW_DAYS))
      .all<{ url: string }>(),
  ]);

  const sources = new Map<string, Tally>();
  const categories = new Map<string, Tally>();
  const axes = new Map<string, Tally>();
  const tags = new Map<string, Tally>();
  const tagWindowStart = daysAgo(TAG_WINDOW_DAYS);

  for (const row of stats) {
    const up = Number(row.up_count);
    const down = Number(row.down_count);

    for (const [map, key] of [
      [sources, row.source],
      [categories, row.category],
      [axes, row.impact_axis],
    ] as const) {
      const tally = tallyOf(map, key);
      tally.up += up;
      tally.down += down;
    }

    // タグの傾向は直近 30 日に限定する
    if (row.published_date >= tagWindowStart) {
      for (const tag of parseTags(row.tags)) {
        const tally = tallyOf(tags, tag);
        tally.up += up;
        tally.down += down;
      }
    }
  }

  const tagEntries = [...tags].map(([tag, tally]) => ({ tag, up: tally.up, down: tally.down }));

  return {
    weights: {
      source: toWeightMap(sources),
      category: toWeightMap(categories),
      impact_axis: toWeightMap(axes),
    },
    tags: {
      liked: tagEntries
        .filter((entry) => entry.up > entry.down)
        .sort((a, b) => b.up - a.up - (b.down - a.down))
        .slice(0, TAG_LIMIT),
      disliked: tagEntries
        .filter((entry) => entry.down > 0)
        .sort((a, b) => b.down - a.down)
        .slice(0, TAG_LIMIT),
    },
    study_group_context: context,
    published_urls: publishedUrls.results.map((row) => row.url),
  };
}
