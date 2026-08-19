import assert from "node:assert/strict";
import test from "node:test";
import { getFilePart, getFileParts, getTextField } from "../server/utils/multipart.ts";

const parts = [
  { name: "title", data: Buffer.from("  タイトル  ") },
  { name: "body", data: Buffer.from("  本文の空白は保持  ") },
  { name: "file", filename: "a.pdf", data: Buffer.from("x") },
  { name: "file", filename: "empty.pdf", data: Buffer.alloc(0) },
  { name: "images", filename: "1.png", data: Buffer.from("x") },
  { name: "images", filename: "2.png", data: Buffer.from("y") },
] as Parameters<typeof getTextField>[0];

test("getTextField は既定で trim し、trim: false で原文を返す", () => {
  assert.equal(getTextField(parts, "title"), "タイトル");
  assert.equal(getTextField(parts, "body", { trim: false }), "  本文の空白は保持  ");
  assert.equal(getTextField(parts, "missing"), "");
  assert.equal(getTextField(undefined, "title"), "");
});

test("getFilePart / getFileParts は空でないファイルパートのみ返す", () => {
  assert.equal(getFilePart(parts)?.filename, "a.pdf");
  assert.deepEqual(
    getFileParts(parts, "images").map((p) => p.filename),
    ["1.png", "2.png"],
  );
  assert.deepEqual(getFileParts(undefined, "images"), []);
});
