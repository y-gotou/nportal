import type { ResourceItem } from "~~/types/portal";
import { parseD1Timestamp } from "#shared/utils/date";

// 発表申し込みフォームの入力値
export interface SpeakerFormValues {
  title: string;
  duration: number | "";
  note: string;
}

// フォームが初期値から変更されているか(手動で初期値へ戻した場合は未変更扱い)
export function isSpeakerFormDirty(current: SpeakerFormValues, initial: SpeakerFormValues): boolean {
  return (
    current.title !== initial.title ||
    current.duration !== initial.duration ||
    current.note !== initial.note
  );
}

// 応募に紐付けられる資料の候補。本人が投稿し、かつ他の応募に紐付いていないもの(現在の紐付け先は含む)
export function selectableResourcesForApplication(
  resources: ResourceItem[],
  applicationId: number,
  userEmail: string,
): ResourceItem[] {
  return resources.filter(
    (resource) =>
      resource.submittedBy === userEmail &&
      (!resource.linkedApplication || resource.linkedApplication.id === applicationId),
  );
}

const postedDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

// created_at(UTC)を JST の日時(時分まで)で表示する
export function formatPostedDateTime(createdAt: string): string {
  const parsed = parseD1Timestamp(createdAt);
  return Number.isNaN(parsed.getTime()) ? createdAt : postedDateTimeFormatter.format(parsed);
}
