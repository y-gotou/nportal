// AI ニュースの収集元。到達性検証（verify-news-sources.mjs）と収集（news-collect.mjs）で共有する。
// クラウド環境の許可ドメインに追加が必要なため、増やすときは docs/requirements-news.md §3.1 も更新する。
//
// aiOnly: AI 専門のフィードかどうか。false（総合 IT メディア）は AI 関連語での絞り込み対象になる。
export const FEEDS = [
  { name: "ITmedia AI+", url: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml", aiOnly: true },
  { name: "Publickey", url: "https://www.publickey1.jp/atom.xml", aiOnly: false },
  { name: "CodeZine", url: "https://codezine.jp/rss/new/20/index.xml", aiOnly: false },
  { name: "gihyo.jp", url: "https://gihyo.jp/feed/rss2", aiOnly: false },
  { name: "PC Watch", url: "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf", aiOnly: false },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", aiOnly: true },
  { name: "Google (The Keyword)", url: "https://blog.google/technology/ai/rss/", aiOnly: true },
  { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", aiOnly: true },
  { name: "AWS ML Blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", aiOnly: true },
  { name: "Azure Blog", url: "https://azure.microsoft.com/en-us/blog/feed/", aiOnly: false },
  { name: "はてブ (AI)", url: "https://b.hatena.ne.jp/q/AI?mode=rss&users=50&sort=recent", aiOnly: false },
  { name: "Zenn (ai)", url: "https://zenn.dev/topics/ai/feed", aiOnly: true },
  { name: "Qiita (ai)", url: "https://qiita.com/tags/ai/feed", aiOnly: true },
  { name: "Hacker News", url: "https://hnrss.org/newest?q=AI+OR+LLM&points=100", aiOnly: true },
];

// 総合フィードから AI 関連の記事だけを拾うための語。取りこぼしを避けるため広めに取る。
export const AI_KEYWORDS = [
  "ai", "ＡＩ", "llm", "生成ai", "人工知能", "機械学習", "ディープラーニング", "深層学習",
  "エージェント", "agent", "claude", "chatgpt", "gpt", "openai", "anthropic", "gemini",
  "copilot", "llama", "mcp", "rag", "プロンプト", "prompt", "推論", "モデル", "model",
  "transformer", "nvidia", "vibe coding", "コード生成",
];

export function looksAiRelated(text) {
  const lowered = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lowered.includes(keyword));
}
