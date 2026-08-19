import type { ReportType, SpeakerApplicationStatus, SurveyStatus } from "~~/types/portal";

// 発表応募ステータスの表示ラベル
export function speakerStatusLabel(status: SpeakerApplicationStatus): string {
  if (status === "pending") return "応募中";
  if (status === "scheduled") return "発表予定";
  return "発表済み";
}

// 発表応募ステータスのバッジ配色
export function speakerStatusClass(status: SpeakerApplicationStatus): string {
  if (status === "pending") return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
  if (status === "scheduled") return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
  return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
}

// アンケートステータスのバッジ配色(公開側・admin 共通。受付中は公開側の青に統一)
export function surveyStatusClass(status: SurveyStatus): string {
  if (status === "draft") return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
  if (status === "active") return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
  return "bg-surface-hover text-muted";
}

// 不具合・要望報告の種別ラベル
export function reportTypeLabel(type: ReportType): string {
  return type === "bug" ? "不具合" : "要望";
}

// 不具合・要望報告の種別バッジ配色
export function reportTypeClass(type: ReportType): string {
  return type === "bug"
    ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
}
