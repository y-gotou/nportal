import { parseD1Timestamp } from "#shared/utils/date";

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
