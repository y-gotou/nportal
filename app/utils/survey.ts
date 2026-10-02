import { parseD1Timestamp } from "#shared/utils/date";

// 回答の枠の下部に置くコメントの帯(表示と入力欄で共用)
export const surveyCommentBandClass =
  "border-t border-emerald-200 bg-emerald-50 px-4 py-2.5 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200";

const commentDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Tokyo",
});

// updated_at(UTC)を JST の年月日で表示する
export function formatCommentDate(updatedAt: string): string {
  const parsed = parseD1Timestamp(updatedAt);
  return Number.isNaN(parsed.getTime()) ? updatedAt : commentDateFormatter.format(parsed);
}
