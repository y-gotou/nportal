import assert from "node:assert/strict";
import test from "node:test";
import { useAdminForm } from "../app/composables/useAdminForm.ts";

test("applyErrors は前回のエラーを置き換え、エラーなしで true を返す", () => {
  const form = useAdminForm("失敗しました。");

  assert.equal(form.applyErrors({ title: "タイトルは必須です。", date: "開催日は必須です。" }), false);
  assert.deepEqual({ ...form.errors }, { title: "タイトルは必須です。", date: "開催日は必須です。" });

  // 一部だけ修正して再検証すると、解消したキーは消え、残りだけになる
  assert.equal(form.applyErrors({ date: "開催日は必須です。" }), false);
  assert.deepEqual({ ...form.errors }, { date: "開催日は必須です。" });

  assert.equal(form.applyErrors({}), true);
  assert.deepEqual({ ...form.errors }, {});
});

test("submitWith は成功時に serverError を残さず、送信中フラグを戻す", async () => {
  const form = useAdminForm("失敗しました。");

  let submittingDuringAction = false;
  await form.submitWith(async () => {
    submittingDuringAction = form.isSubmitting.value;
  });

  assert.equal(submittingDuringAction, true);
  assert.equal(form.isSubmitting.value, false);
  assert.equal(form.serverError.value, null);
});

test("submitWith は Error のメッセージを、Error 以外は既定文言を serverError に設定する", async () => {
  const form = useAdminForm("既定の失敗文言。");

  await form.submitWith(async () => {
    throw new Error("サーバー側の詳細メッセージ");
  });
  assert.equal(form.isSubmitting.value, false);
  assert.equal(form.serverError.value, "サーバー側の詳細メッセージ");

  await form.submitWith(async () => {
    throw "string error";
  });
  assert.equal(form.serverError.value, "既定の失敗文言。");

  // 失敗後に成功すると serverError はクリアされる
  await form.submitWith(async () => {});
  assert.equal(form.serverError.value, null);
});
