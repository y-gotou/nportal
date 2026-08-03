// 掲載データ(payload.json)を執筆ルール(docs/news-routine.md §4)に照らして検証する。
// routine が投入前に実行し、NG があれば修正してから news-publish.mjs を呼ぶ。
//
// 使い方:
//   node scripts/news-validate.mjs <payload.json>
//
// NG が 1 件以上あれば exit 1。警告(掲載件数 5 件未満など)のみなら exit 0。

import { readFileSync } from "node:fs";

const [, , payloadPath] = process.argv;

if (!payloadPath) {
  console.error("Usage: node scripts/news-validate.mjs <payload.json>");
  process.exit(1);
}

const CATEGORIES = ["プロダクト", "規制・リスク", "研究", "事例"];
const IMPACT_AXES = ["tooling", "risk", "practice", "learning", "landscape"];
const SOURCE_TYPES = ["media", "personal"];
// 個人ブログ・体験記の 1 日あたり上限（docs/news-routine.md §2 出典バランス）
const PERSONAL_SOURCE_LIMIT = 3;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
const errors = [];
const warnings = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

check(DATE_PATTERN.test(payload.published_date ?? ""), `published_date が YYYY-MM-DD ではない: ${payload.published_date}`);

if (payload.type === "daily") {
  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  check(Array.isArray(payload.articles), "articles が配列ではない");
  check(articles.length <= 8, `掲載件数が 8 件を超えている: ${articles.length} 件`);
  if (articles.length < 5) warnings.push(`掲載件数が 5 件未満: ${articles.length} 件(観点に当てはまらない候補を落とした結果なら可)`);

  articles.forEach((article, index) => {
    const label = `articles[${index}] ${String(article.title ?? "").slice(0, 15)}`;
    const c = (condition, message) => check(condition, `${label}: ${message}`);

    c(typeof article.url === "string" && article.url.startsWith("https://"), `url が https:// で始まらない`);
    c(typeof article.title === "string" && article.title.length > 0, "title が空");
    c(typeof article.source === "string" && article.source.length > 0, "source が空");
    c(CATEGORIES.includes(article.category), `category が不正: ${article.category}`);
    c(IMPACT_AXES.includes(article.impact_axis), `impact_axis が不正: ${article.impact_axis}`);
    c(SOURCE_TYPES.includes(article.source_type), `source_type が不正: ${article.source_type}(media / personal のいずれか)`);

    const tags = Array.isArray(article.tags) ? article.tags : [];
    c(tags.length >= 2 && tags.length <= 4, `tags は 2〜4 件: ${tags.length} 件`);

    const summary = String(article.summary ?? "");
    c(summary.length >= 120 && summary.length <= 180, `summary は 120〜180 字: ${summary.length} 字`);

    const why = String(article.why_important ?? "");
    c(why.length >= 40 && why.length <= 80, `why_important は 40〜80 字: ${why.length} 字`);

    const glossary = Array.isArray(article.glossary) ? article.glossary : [];
    c(glossary.length <= 3, `glossary は 3 件まで: ${glossary.length} 件`);
    c(glossary.every((entry) => entry?.term && entry?.description), "glossary に term / description が欠けた要素がある");

    // summary 中の [[…]] と glossary の term は 1 対 1 で対応させる
    const marks = [...summary.matchAll(/\[\[(.+?)\]\]/g)].map((match) => match[1]).sort();
    const terms = glossary.map((entry) => String(entry.term)).sort();
    c(JSON.stringify(marks) === JSON.stringify(terms), `summary の [[…]] と glossary が一致しない: marks=${JSON.stringify(marks)} terms=${JSON.stringify(terms)}`);

    c(typeof article.ai_score === "number" && article.ai_score >= 0 && article.ai_score <= 100, `ai_score が 0〜100 の数値ではない: ${article.ai_score}`);
    c(DATE_PATTERN.test(article.article_date ?? ""), `article_date が YYYY-MM-DD ではない: ${article.article_date}`);
  });

  const personalCount = articles.filter((article) => article.source_type === "personal").length;
  check(personalCount <= PERSONAL_SOURCE_LIMIT, `個人ブログ・体験記(source_type: personal)は 1 日 ${PERSONAL_SOURCE_LIMIT} 件まで: ${personalCount} 件`);
} else if (payload.type === "weekly") {
  check(typeof payload.overview === "string" && payload.overview.length > 0, "overview が空");
  const urls = Array.isArray(payload.article_urls) ? payload.article_urls : [];
  check(Array.isArray(payload.article_urls), "article_urls が配列ではない");
  check(urls.length >= 5 && urls.length <= 8, `article_urls は 5〜8 件: ${urls.length} 件`);
  check(urls.every((url) => typeof url === "string" && url.startsWith("https://")), "article_urls に https:// で始まらない要素がある");
} else {
  check(false, `type が daily / weekly のいずれでもない: ${payload.type}`);
}

for (const message of errors) console.log(`NG ${message}`);
for (const message of warnings) console.log(`警告 ${message}`);

if (errors.length > 0) {
  console.log(`検証 NG: ${errors.length} 件。修正して再実行すること`);
  process.exit(1);
}

console.log(`検証 OK${warnings.length > 0 ? `(警告 ${warnings.length} 件)` : ""}`);
