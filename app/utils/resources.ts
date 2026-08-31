import type { ResourceItem } from "~~/types/portal";

// ファイル資料の直接リンクのみ新規タブで開く。
// Markdown はビューアーページ、URL 資料は外部リンク動作(プラグイン側で処理)のため対象外。
export function resourceOpensInNewTab(resource: ResourceItem): boolean {
  return resource.sourceType === "file" && resource.url?.startsWith("/api/") === true;
}
