import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const appDir = new URL("../app/", import.meta.url);

// ライト用の淡い背景色・濃い文字色。暗い背景では白い箱や読みにくい文字になる
const lightOnlyClass =
  /(?<![\w:-])(?:hover:)?(?:bg-(?:red|rose|amber|blue|green|sky|violet|teal)-50|text-(?:red|rose|amber|blue|green)-(?:600|700|800))(?![\w/-])/;

// ponytail: 行単位の検査。class が複数行に分かれた場合は検出できないため、その書き方が増えたら属性単位の解析に替える
test("light palette classes are paired with a dark variant on the same line", async () => {
  const files = (await readdir(appDir, { recursive: true })).filter((file) => /\.(vue|ts)$/.test(file));
  const missing = [];

  for (const file of files) {
    const lines = (await readFile(new URL(file, appDir), "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (lightOnlyClass.test(line) && !line.includes("dark:")) missing.push(`${file}:${index + 1}`);
    });
  }

  assert.deepEqual(missing, []);
});
