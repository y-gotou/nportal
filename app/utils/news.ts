import type { NewsImpactAxis } from "~~/types/portal";

// 日本語は既定で文字単位に折り返せるため、単語の途中で改行される。
// auto-phrase は文節単位で折り返し、strict は小書き仮名・長音符の行頭禁則を適用する。
// auto-phrase 未対応のブラウザでは既定の折り返しにフォールバックする。
export const japaneseTextClass = "[word-break:auto-phrase] [line-break:strict]";

// 観点の見出し(docs/requirements-news.md §5.3)
const IMPACT_AXIS_LABELS: Record<NewsImpactAxis, string> = {
  tooling: "業務での使いどころ",
  risk: "注意したい点",
  practice: "すぐ試せること",
  learning: "勉強会での使いどころ",
  landscape: "押さえておきたい背景",
};

// カテゴリの配色(§8.2)。未知のカテゴリはプロダクト扱いにフォールバックする
const CATEGORY_CLASSES: Record<string, string> = {
  "プロダクト": "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  "規制・リスク": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "研究": "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "事例": "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

const DEFAULT_CATEGORY_CLASS = CATEGORY_CLASSES["プロダクト"]!;

const dateWithWeekdayFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const updatedAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

export function impactAxisLabel(axis: NewsImpactAxis) {
  return IMPACT_AXIS_LABELS[axis];
}

export function categoryClass(category: string) {
  return CATEGORY_CLASSES[category] ?? DEFAULT_CATEGORY_CLASS;
}

export function formatRank(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function formatDateWithWeekday(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : dateWithWeekdayFormatter.format(parsed);
}

// D1 の created_at は UTC の "YYYY-MM-DD HH:MM:SS" 形式で入る
export function formatUpdatedAt(value: string) {
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? value : updatedAtFormatter.format(parsed);
}

// 掲載日の範囲ラベル(週次ダイジェスト見出し用)
export function formatDateRange(startDate: string, endDate: string) {
  const format = (date: string) => date.replace(/-/g, ".");
  return `${format(startDate)} — ${format(endDate).slice(5)}`;
}

export function stripTermMarkers(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}
