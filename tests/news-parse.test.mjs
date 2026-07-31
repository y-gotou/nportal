import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUrl, parseFeed } from "../scripts/news-parse.mjs";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[新モデルが公開 &amp; 提供開始]]></title>
    <link>https://example.com/news/1</link>
    <pubDate>Thu, 30 Jul 2026 09:00:00 +0900</pubDate>
    <description>&lt;p&gt;本文の&lt;b&gt;要約&lt;/b&gt;です。&lt;/p&gt;</description>
  </item>
  <item>
    <title>日付がない記事</title>
    <link>https://example.com/news/2</link>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom の記事</title>
    <link rel="alternate" href="https://example.com/atom/1"/>
    <updated>2026-07-29T12:00:00Z</updated>
    <summary>Atom の要約テキスト。</summary>
  </entry>
</feed>`;

test("parseFeed は RSS の要素を取り出し、実体参照とCDATAを展開する", () => {
  const entries = parseFeed(RSS);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, "新モデルが公開 & 提供開始");
  assert.equal(entries[0].url, "https://example.com/news/1");
  assert.equal(entries[0].publishedAt.toISOString(), "2026-07-30T00:00:00.000Z");
  assert.equal(entries[0].body, "本文の 要約 です。");
});

test("parseFeed は日付がない記事も返す（新着判定は呼び出し側で行う）", () => {
  const entries = parseFeed(RSS);
  assert.equal(entries[1].publishedAt, null);
});

test("parseFeed は Atom の link href と updated を読む", () => {
  const entries = parseFeed(ATOM);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, "https://example.com/atom/1");
  assert.equal(entries[0].publishedAt.toISOString(), "2026-07-29T12:00:00.000Z");
  assert.equal(entries[0].body, "Atom の要約テキスト。");
});

test("parseFeed はタイトルまたはURLがない要素を除外する", () => {
  const entries = parseFeed("<rss><channel><item><title>題名のみ</title></item></channel></rss>");
  assert.equal(entries.length, 0);
});

test("normalizeUrl は計測用パラメータを除去し、記事IDのクエリは残す", () => {
  assert.equal(
    normalizeUrl("https://EXAMPLE.com/news/1/?utm_source=x&p=5#top"),
    "https://example.com/news/1?p=5",
  );
});

test("normalizeUrl は不正なURLをそのまま返す", () => {
  assert.equal(normalizeUrl("not a url"), "not a url");
});
