// 日次をまたぐ同一話題の再掲に選定時点で気づけるようにする、タイトル類似の軽量ヒューリスティック。
// 判定は注意喚起であり、落とすか続報として掲載するかの最終判断は routine が行う(誤検出は許容する)。
//
// トークン: 英数字の連続(2 文字以上)+ 日本語(かな・漢字)の連続から作るバイグラム
// 類似度: overlap coefficient = |A∩B| / min(|A|, |B|)

const ASCII_TOKEN_PATTERN = /[a-z0-9]{2,}/g;
const CJK_RUN_PATTERN = /[々぀-ヿ㐀-鿿]+/g;

export const SIMILARITY_THRESHOLD = 0.4;

export function titleTokens(title) {
  const normalized = String(title ?? "").normalize("NFKC").toLowerCase();
  const tokens = new Set(normalized.match(ASCII_TOKEN_PATTERN) ?? []);

  for (const run of normalized.match(CJK_RUN_PATTERN) ?? []) {
    if (run.length === 1) {
      tokens.add(run);
      continue;
    }
    for (let i = 0; i + 1 < run.length; i += 1) {
      tokens.add(run.slice(i, i + 2));
    }
  }

  return tokens;
}

export function titleSimilarity(a, b) {
  const tokensA = titleTokens(a);
  const tokensB = titleTokens(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }

  return shared / Math.min(tokensA.size, tokensB.size);
}

// recentArticles(直近の掲載記事)から類似タイトルを類似度の高い順に返す
export function findSimilarTitles(title, recentArticles, limit = 3) {
  return recentArticles
    .map((article) => ({ article, score: titleSimilarity(title, article.title) }))
    .filter((entry) => entry.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => ({
      url: article.url,
      title: article.title,
      published_date: article.published_date,
    }));
}
