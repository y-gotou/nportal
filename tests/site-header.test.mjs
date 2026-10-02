import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const header = await readFile(
  new URL("../app/components/site/SiteHeader.vue", import.meta.url),
  "utf8",
);
const template = header.slice(header.indexOf("<template>"));

// 9項目の横並びには約 940px が必要なため、md(768px)では文字が折り返す
test("desktop navigation and user menu appear from the lg breakpoint without wrapping", () => {
  assert.match(template, /<nav\s+class="hidden items-center gap-2 whitespace-nowrap lg:flex"/);
  assert.match(template, /class="relative hidden shrink-0 border-l border-border pl-3 lg:block"/);
  assert.match(template, /<strong class="[^"]*whitespace-nowrap[^"]*">N Portal<\/strong>/);
});

test("mobile menu button and drawer are used below the lg breakpoint", () => {
  assert.equal(template.match(/lg:hidden/g)?.length, 3);
  assert.doesNotMatch(template, /md:(flex|block|hidden)/);
});

test("header shows the email from the xl breakpoint and truncates long addresses", () => {
  assert.match(
    template,
    /<span class="hidden max-w-48 truncate text-xs text-muted xl:block">\{\{ currentUser\.email \}\}<\/span>/,
  );
});
