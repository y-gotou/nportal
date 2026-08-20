import type { D1DatabaseLike } from "../../types/portal.ts";
import { VOTE_COEFFICIENT } from "./news.ts";
import { parseStringArray } from "../../shared/utils/json.ts";
import { utcDaysAgo } from "../../shared/utils/date.ts";

// docs/requirements-news.md §7.2 の重み式
const WEIGHT_STRENGTH = 0.3;
const WEIGHT_SMOOTHING = 5;
const WEIGHT_MIN = 0.7;
const WEIGHT_MAX = 1.3;

const WEIGHT_WINDOW_DAYS = 90;
const TAG_WINDOW_DAYS = 30;
const RECENT_ARTICLE_WINDOW_DAYS = 14;
const TAG_LIMIT = 10;
const CONTEXT_LIMIT = 20;

interface ArticleStatsRow {
  url: string;
  title: string;
  source: string;
  category: string;
  impact_axis: string;
  tags: string;
  published_date: string;
  ai_score: number;
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
  // 直近の掲載記事。日次は重複除外、週次は上位再掲の選定に使う
  recent_articles: Array<{
    url: string;
    title: string;
    published_date: string;
    source: string;
    category: string;
    impact_axis: string;
    tags: string[];
    up: number;
    down: number;
    final_score: number;
  }>;
}

async function loadArticleStats(db: D1DatabaseLike): Promise<ArticleStatsRow[]> {
  const { results } = await db
    .prepare(
      `SELECT a.url, a.title, a.source, a.category, a.impact_axis, a.tags, a.published_date, a.ai_score,
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
      .bind(utcDaysAgo(TAG_WINDOW_DAYS))
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
    recent_topics: unique(minutes.results.flatMap((row) => parseStringArray(row.topics))),
    resource_tags: unique(resources.results.flatMap((row) => parseStringArray(row.tags))),
    upcoming_sessions: applications.results.map((row) => row.title),
  };
}

export async function buildFeedbackSummary(db: D1DatabaseLike): Promise<FeedbackSummary> {
  const [stats, context] = await Promise.all([
    loadArticleStats(db),
    loadStudyGroupContext(db),
  ]);

  const sources = new Map<string, Tally>();
  const categories = new Map<string, Tally>();
  const axes = new Map<string, Tally>();
  const tags = new Map<string, Tally>();
  const tagWindowStart = utcDaysAgo(TAG_WINDOW_DAYS);
  const weightWindowStart = utcDaysAgo(WEIGHT_WINDOW_DAYS);

  for (const row of stats) {
    const up = Number(row.up_count);
    const down = Number(row.down_count);

    // 重みの集計は直近 90 日に限定する（票数の蓄積で平滑化項が効かなくなり、初期の評価が固定化するのを防ぐ）
    if (row.published_date >= weightWindowStart) {
      for (const [map, key] of [
        [sources, row.source],
        [categories, row.category],
        [axes, row.impact_axis],
      ] as const) {
        const tally = tallyOf(map, key);
        tally.up += up;
        tally.down += down;
      }
    }

    // タグの傾向は直近 30 日に限定する
    if (row.published_date >= tagWindowStart) {
      for (const tag of parseStringArray(row.tags)) {
        const tally = tallyOf(tags, tag);
        tally.up += up;
        tally.down += down;
      }
    }
  }

  const tagEntries = [...tags].map(([tag, tally]) => ({ tag, up: tally.up, down: tally.down }));
  const recentWindowStart = utcDaysAgo(RECENT_ARTICLE_WINDOW_DAYS);
  const recentArticles = stats
    .filter((row) => row.published_date >= recentWindowStart)
    .map((row) => ({
      url: row.url,
      title: row.title,
      published_date: row.published_date,
      source: row.source,
      category: row.category,
      impact_axis: row.impact_axis,
      tags: parseStringArray(row.tags),
      up: Number(row.up_count),
      down: Number(row.down_count),
      final_score:
        Number(row.ai_score) + VOTE_COEFFICIENT * (Number(row.up_count) - Number(row.down_count)),
    }))
    .sort(
      (a, b) =>
        b.published_date.localeCompare(a.published_date) || b.final_score - a.final_score,
    );

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
        .filter((entry) => entry.down > entry.up)
        .sort((a, b) => b.down - a.down)
        .slice(0, TAG_LIMIT),
    },
    study_group_context: context,
    recent_articles: recentArticles,
  };
}
