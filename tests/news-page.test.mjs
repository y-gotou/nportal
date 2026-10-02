import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("news page delegates the page background to the layout token", async () => {
  const page = await readSource("../app/pages/news.vue");

  assert.doesNotMatch(page, /bg-\[#/);
  assert.doesNotMatch(page, /min-h-\[calc\(100vh/);
});

test("news page panel matches the card style used by other pages", async () => {
  const page = await readSource("../app/pages/news.vue");

  assert.match(page, /rounded-xl border border-border bg-surface shadow-sm/);
  assert.doesNotMatch(page, /shadow-\[/);
});

test("news page keeps the newspaper-style layout", async () => {
  const page = await readSource("../app/pages/news.vue");

  assert.match(page, /AI NEWS/);
  assert.match(page, /sticky top-\[73px\]/);
  assert.match(page, /<NewsArticleRow/);
  assert.match(page, /<NewsDigestRow/);
});

test("news rows use the muted token for summary text and keep rule-based rows", async () => {
  for (const path of [
    "../app/components/news/NewsArticleRow.vue",
    "../app/components/news/NewsDigestRow.vue",
  ]) {
    const component = await readSource(path);

    assert.match(component, /leading-\[1\.85\] text-muted/);
    assert.doesNotMatch(component, /leading-\[1\.85\] text-slate-600/);
    assert.match(component, /border-b border-border/);
  }
});

test("news glossary popover uses the shared shadow scale", async () => {
  const term = await readSource("../app/components/news/NewsTerm.vue");

  assert.match(term, /shadow-lg/);
  assert.doesNotMatch(term, /shadow-\[/);
});

// タブと掲載日ナビの幅の合計がバーの幅を超えると、タブの文字が 1 文字ずつ縦に折り返していた
test("news tab bar wraps the date navigation instead of the tab labels", async () => {
  const page = await readSource("../app/pages/news.vue");

  assert.match(page, /class="sticky top-\[73px\][^"]*\bflex-wrap\b[^"]*"/);
  assert.match(page, /class="[^"]*\bwhitespace-nowrap\b[^"]*"\s+:class="tabClass\(tab\)"/);
  assert.match(page, /v-if="currentDate" class="[^"]*\bml-auto\b[^"]*"/);
});

test("news page sets its browser tab title", async () => {
  const page = await readSource("../app/pages/news.vue");

  assert.match(page, /useSeoMeta\(\{\s*title: "AIニュース",/);
});
