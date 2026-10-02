import assert from "node:assert/strict";
import test from "node:test";
import { errorPageContent } from "../app/utils/error-page.ts";

test("errorPageContent は 404 でページが見つからない旨を返す", () => {
  assert.equal(errorPageContent(404).heading, "ページが見つかりません");
});

test("errorPageContent は 404 以外と不明なコードで汎用のエラー文を返す", () => {
  for (const statusCode of [500, 403, undefined]) {
    const content = errorPageContent(statusCode);
    assert.equal(content.heading, "エラーが発生しました");
    assert.equal(content.description, "時間をおいて再度お試しください。");
  }
});
