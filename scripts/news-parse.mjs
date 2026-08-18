// RSS 2.0 / Atom / RDF から必要な要素だけ取り出す最小パーサ。
// 依存パッケージを増やさないために自前で持つ（routine で npm install を走らせないため）。

function decodeEntities(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(block, name) {
  const matched = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return matched ? decodeEntities(matched[1]).trim() : "";
}

// Atom の link は href 属性、RSS は要素の中身に URL が入る
function pickLink(block) {
  const atom = /<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i.exec(block)
    ?? /<link[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i.exec(block);
  if (atom) return decodeEntities(atom[1]).trim();

  const rss = pickTag(block, "link");
  if (rss) return rss;

  return pickTag(block, "guid");
}

function pickDate(block) {
  for (const name of ["pubDate", "published", "updated", "dc:date"]) {
    const value = pickTag(block, name);
    if (!value) continue;

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function pickBody(block) {
  for (const name of ["content:encoded", "description", "summary", "content"]) {
    const value = pickTag(block, name);
    if (value) return stripTags(value);
  }
  return "";
}

export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];

  return blocks
    .map((block) => ({
      title: stripTags(pickTag(block, "title")),
      url: pickLink(block),
      publishedAt: pickDate(block),
      body: pickBody(block).slice(0, 800),
    }))
    .filter((entry) => entry.title && entry.url);
}

// 計測用パラメータのみ除去する。厳密な重複判定はサーバー側の取り込みで行う。
const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_(cid|eid)$|ref$|ref_src$)/;

export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// 一次ドメインはハブ・製品・ドキュメントページが混ざるため、個別記事のパスに限定する
const PRIMARY_ARTICLE_PATHS = new Map([
  ["anthropic.com", ["/news/", "/research/", "/engineering/"]],
  ["ai.meta.com", ["/blog/"]],
]);

export function isArticleUrl(url) {
  // 検索結果には相対 URL（リダイレクタのパスなど）が混ざることがある。
  // normalizeUrl は解析に失敗した文字列をそのまま返すため、ここで弾く。
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const { hostname, pathname } = parsed;
  if (pathname === "/") return false;
  const host = hostname.replace(/^www\./, "");
  for (const [domain, prefixes] of PRIMARY_ARTICLE_PATHS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return prefixes.some((prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length);
    }
  }
  return true;
}
