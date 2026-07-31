// AI ニュースの収集元。到達性検証（verify-news-sources.mjs）と収集（news-collect.mjs）で共有する。
// クラウド環境の許可ドメインに追加が必要なため、増やすときは docs/requirements-news.md §3.1 も更新する。
export const FEEDS = [
  ["ITmedia AI+", "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml"],
  ["Publickey", "https://www.publickey1.jp/atom.xml"],
  ["CodeZine", "https://codezine.jp/rss/new/20/index.xml"],
  ["gihyo.jp", "https://gihyo.jp/feed/rss2"],
  ["PC Watch", "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf"],
  ["OpenAI", "https://openai.com/news/rss.xml"],
  ["Google (The Keyword)", "https://blog.google/technology/ai/rss/"],
  ["Google DeepMind", "https://deepmind.google/blog/rss.xml"],
  ["AWS ML Blog", "https://aws.amazon.com/blogs/machine-learning/feed/"],
  ["Azure Blog", "https://azure.microsoft.com/en-us/blog/feed/"],
  ["はてブ (AI)", "https://b.hatena.ne.jp/q/AI?mode=rss&users=50&sort=recent"],
  ["Zenn (ai)", "https://zenn.dev/topics/ai/feed"],
  ["Qiita (ai)", "https://qiita.com/tags/ai/feed"],
  ["Hacker News", "https://hnrss.org/newest?q=AI+OR+LLM&points=100"],
];
