import type { NewsImpactAxis } from "~~/types/portal";

// 説明文の見出しは impact_axis に応じて切り替える(docs/requirements-news.md §5.3)
const IMPACT_AXIS_HEADINGS: Record<NewsImpactAxis, string> = {
  tooling: "💼 業務での使いどころ",
  risk: "⚠️ 注意したい点",
  practice: "🛠️ すぐ試せること",
  learning: "🧪 勉強会での使いどころ",
  landscape: "🗺️ 押さえておきたい背景",
};

export function impactAxisHeading(axis: NewsImpactAxis) {
  return IMPACT_AXIS_HEADINGS[axis];
}
