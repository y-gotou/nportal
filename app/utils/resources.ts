import type { Component } from "vue";
import {
  Code,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileType,
  Hash,
  Image,
  Link,
  Presentation,
  Table,
  TextAlignStart,
} from "lucide-vue-next";
import type { ResourceItem } from "~~/types/portal";

// ファイル資料の直接リンクのみ新規タブで開く。
// Markdown はビューアーページ、URL 資料は外部リンク動作(プラグイン側で処理)のため対象外。
export function resourceOpensInNewTab(resource: ResourceItem): boolean {
  return resource.sourceType === "file" && resource.url?.startsWith("/api/") === true;
}

export interface ResourceTypeIcon {
  icon: Component;
  colorClass: string;
}

const fallbackTypeIcon: ResourceTypeIcon = { icon: File, colorClass: "text-muted" };

// 種類の値は投稿時に server/utils/upload.ts の inferResourceType が決める。
// 過去データ等でここに無い値が入っている資料は File と同じ表示にする
const resourceTypeIcons: Record<string, ResourceTypeIcon> = {
  PDF: { icon: FileText, colorClass: "text-red-600 dark:text-red-400" },
  PowerPoint: { icon: Presentation, colorClass: "text-orange-600 dark:text-orange-400" },
  Word: { icon: FileType, colorClass: "text-blue-600 dark:text-blue-400" },
  Excel: { icon: FileSpreadsheet, colorClass: "text-green-600 dark:text-green-400" },
  CSV: { icon: Table, colorClass: "text-teal-600 dark:text-teal-400" },
  Text: { icon: TextAlignStart, colorClass: "text-muted" },
  Markdown: { icon: Hash, colorClass: "text-violet-600 dark:text-violet-400" },
  HTML: { icon: Code, colorClass: "text-amber-600 dark:text-amber-400" },
  Image: { icon: Image, colorClass: "text-pink-600 dark:text-pink-400" },
  ZIP: { icon: FileArchive, colorClass: "text-yellow-700 dark:text-yellow-400" },
  URL: { icon: Link, colorClass: "text-sky-600 dark:text-sky-400" },
};

export function resourceTypeIcon(type: string): ResourceTypeIcon {
  return Object.hasOwn(resourceTypeIcons, type) ? resourceTypeIcons[type]! : fallbackTypeIcon;
}

export interface ResourceFilters {
  keyword: string;
  type: string | null;
  tag: string | null;
  mineOnly: boolean;
  userEmail: string | null;
}

export function matchesResourceFilters(resource: ResourceItem, filters: ResourceFilters): boolean {
  if (filters.tag && !resource.tags.includes(filters.tag)) {
    return false;
  }

  if (filters.type && resource.type !== filters.type) {
    return false;
  }

  // 編集可否(canEdit)は管理者にも真となるため、投稿者との一致で判定する
  if (filters.mineOnly && (!filters.userEmail || resource.submittedBy !== filters.userEmail)) {
    return false;
  }

  const keyword = filters.keyword.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return (
    resource.title.toLowerCase().includes(keyword) ||
    (resource.presenter?.toLowerCase().includes(keyword) ?? false) ||
    (resource.fileName?.toLowerCase().includes(keyword) ?? false) ||
    (resource.submittedBy?.toLowerCase().includes(keyword) ?? false) ||
    resource.tags.some((tag) => tag.toLowerCase().includes(keyword))
  );
}
