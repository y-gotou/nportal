import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const appDir = new URL("../app/", import.meta.url);
const readSource = (path) => readFile(new URL(path, appDir), "utf8");

// 統一した表記の旧表記。画面ごとに違う文言へ戻らないよう、テンプレートに残っていないことを検査する
const retired = [
  ["チャットを見る", /チャットを見る/],
  ["資料を見る", /資料を見る/],
  ["資料共有へ戻る", /資料共有へ戻る/],
  ["発表者募集", /発表者募集/],
  ["紐付けなし", /紐付けなし/],
  ["未選択", /未選択/],
  ["予定一覧", /予定一覧/],
  ["資料一覧へ", /資料一覧へ/],
  ["すべて見る", /すべて見る/],
  ["申し込み", /申し込/],
  ["エントリー", /エントリー/],
  ["登録されていません", /登録されていません/],
  ["該当する〜が見つかりません", /該当する/],
  ["ステータス", /ステータス/],
  ["進行中表示の ...", /中\.\.\./],
  ["全角括弧", /[（）]/],
  ["半角の疑問符", /ますか\?/],
];

const isComment = (line) => /^\s*(\/\/|<!--|\*)/.test(line);

test("retired wording does not remain in templates", async () => {
  const files = (await readdir(appDir, { recursive: true })).filter((file) => file.endsWith(".vue"));
  const found = [];

  for (const file of files) {
    const lines = (await readSource(file)).split("\n");
    lines.forEach((line, index) => {
      if (isComment(line)) return;
      for (const [label, pattern] of retired) {
        if (pattern.test(line)) found.push(`${file}:${index + 1} ${label}`);
      }
    });
  }

  assert.deepEqual(found, []);
});

test("home page links use the unified labels", async () => {
  const page = await readSource("pages/index.vue");

  for (const label of ["議題を見る", "チャットを開く", "スケジュール一覧を見る", "議事録一覧", "資料一覧", "議事録を見る", "資料を開く"]) {
    assert.match(page, new RegExp(`\\s${label}\\s`));
  }
  assert.doesNotMatch(page, /関連議事録/);
  assert.match(page, /回答者数: \{\{/);
  assert.match(page, /設問数: \{\{/);
});

test("list pages are titled as lists", async () => {
  assert.match(await readSource("pages/resources/index.vue"), /<SectionHeader title="資料一覧">/);
  assert.match(await readSource("pages/todos.vue"), /<SectionHeader title="課題一覧" \/>/);
  assert.match(await readSource("pages/speakers.vue"), /<SectionHeader title="発表募集">/);
});

// 登録が 0 件のときに「条件に合う〜はありません」と表示すると、絞り込みのせいに見える
test("empty lists distinguish no data from no match", async () => {
  assert.match(
    await readSource("pages/resources/index.vue"),
    /resources\.length \? "条件に合う資料はありません。" : "資料はまだありません。"/,
  );
  assert.match(
    await readSource("components/minutes/MinutesSearch.vue"),
    /isFiltered \? "条件に合う議事録はありません。" : "議事録はまだありません。"/,
  );
});

test("public pages show the part of the email before the at sign", async () => {
  assert.match(await readSource("pages/speakers.vue"), /chatDisplayName\(app\.user_email\)/);
  assert.match(await readSource("pages/resources/index.vue"), /chatDisplayName\(resource\.submittedBy\)/);
  assert.match(await readSource("pages/resources/[id].vue"), /chatDisplayName\(resource\.submittedBy\)/);
});

test("required marks share one color", async () => {
  const files = (await readdir(appDir, { recursive: true })).filter((file) => file.endsWith(".vue"));

  for (const file of files) assert.doesNotMatch(await readSource(file), /text-rose-500/, file);
});
