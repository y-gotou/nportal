# T-026 実装計画

## 設計判断

1. **登録者の列**: `db/schema.sql` の `todos` に `created_by TEXT`(NULL 許容)を追加する。値は追加した利用者のメールアドレス。既存の DB への適用は `ALTER TABLE todos ADD COLUMN created_by TEXT;` の 1 文(`schema.sql` は `CREATE TABLE IF NOT EXISTS` のため、既存の表には列が追加されない)。ローカル D1 はエージェントが適用し、Preview・本番の D1 はユーザーが適用する。
2. **適用の順序**: 列の追加は、PR の merge より前に行う。列が無い状態で新しいコードが動くと、一覧の取得と追加が失敗するため。列は NULL 許容の追加のみで、現行のコードは列を参照しないため、先に適用しても現行の動作に影響しない。
3. **API の経路**: 追加・編集・削除を、管理者用の経路から一般の経路へ移す(`POST /api/todos`、`PUT /api/todos/{id}`、`DELETE /api/todos/{id}`)。`server/api/admin/todos/` の 3 ファイルを `server/api/todos.post.ts`・`server/api/todos/[id].put.ts`・`server/api/todos/[id].delete.ts` へ移動し(配置は資料の API に合わせる)、`assertAdmin` を `requireUser` に置き換える。管理者用の経路は残さない(権限の判定を 1 か所にまとめるため。資料の編集・削除と同じ構成)。
4. **権限の判定**: 純粋関数 `canEditTodo(todo, user)` を `shared/utils/todos.ts` に置き、サーバーと画面の双方で使う。判定は「管理者である、または登録者が本人と一致する」。登録者が NULL の課題は管理者のみ真となる。
   - サーバー: `updateTodo`・`deleteTodo` に利用者を渡し、対象の課題を取得して判定する。課題が無ければ 404、権限が無ければ 403(資料の `getEditableResourceRow` と同じ順序)。`createTodo` には利用者のメールアドレスを渡して `created_by` に保存する。`updateTodo` は `created_by` を更新しない。
   - 一覧の API(`GET /api/todos`)は `createdBy` を返す。行ごとの操作可否は画面側で `canEditTodo` により求める(一覧の API に利用者別の値を持たせない)。
5. **表のコンポーネント(`TodoTable.vue`)**:
   - `editable`(真偽値)を廃止し、`user`(現在の利用者。省略可)を受け取る。行ごとに `canEditTodo` で、チェックボックスの操作可否と編集・削除のアイコンの表示を決める。議事録ページは `user` を渡さないため、従来どおり操作できない。
   - 操作の列は、操作できる課題が 1 件以上あるときに表示する(完了済みの折りたたみで列が増減しないよう、表示中の行ではなく全件で判定する)。
   - 登録者の列は、新しい属性 `showCreatedBy` を指定したときに表示する(課題ページのみ指定)。表示は `chatDisplayName` を用いる。編集中の行でも文字のまま表示する。
6. **課題ページ(`todos.vue`)**: 追加欄と、議事録の選択肢の取得を、全利用者に対して有効にする。

## 影響範囲

- データ: `todos` テーブルに列を追加(`db/schema.sql`)。ローカル・Preview・本番の D1 に `ALTER TABLE` の適用が必要。
- サーバー: `server/utils/todos.ts`、`server/api/todos.get.ts` と同じ階層へ移す追加・編集・削除の 3 経路(`server/api/admin/todos/` は削除)。
- 共有: `shared/utils/todos.ts`(`canEditTodo`)、`types/portal.ts`(`Todo` に `createdBy`)。
- 画面: `app/pages/todos.vue`、`app/components/todo/TodoTable.vue`。議事録の詳細ページは変更しない。
- テスト: `tests/todos-server.test.ts`(登録者の記録、権限による 403、既存テストの引数の追従)、`tests/todos-utils.test.ts`(`canEditTodo`)。
- 恒久仕様書: `docs/requirements-todos.md`(§2・§3・§4・§5・対象外)。
- 更新情報: `app/utils/changelog.ts` に `improvement` を 1 項目追記する。
- 設定・環境変数の変更は無い。

## 作業項目

- [x] 1. 失敗するテストを先に追加する(登録者の記録、本人・他人・管理者・登録者なしの各場合の編集・削除・完了の切り替え、`canEditTodo`)。
- [x] 2. スキーマ・型・サーバーの実装(列の追加、`canEditTodo`、`createTodo`・`updateTodo`・`deleteTodo`・`listTodos`、API の経路の移動)。ローカル D1 に `ALTER TABLE` を適用する。
- [x] 3. 画面の実装(追加欄の開放、登録者の列、行ごとの操作可否)。
- [x] 4. 恒久仕様書と更新情報の反映。
- [ ] 5. 検証(下記のエージェント実施分)と、PR 本文・ユーザー実施手順の提示。

## 検証方法

### エージェント実施
- [x] `npm test`
- [x] `npm run check`
- [x] ローカルブラウザ確認(管理者): 追加した課題の登録者に自分が表示される。すべての課題を操作できる。登録者なしの課題は登録者が空欄で、操作できる。議事録ページの課題表に登録者の列が無く、操作できない。
- [x] ローカルブラウザ確認(管理者以外。モックログインは管理者のため、画面が保持する利用者情報を管理者以外に書き換え、課題一覧の API の応答を差し替えて確認): 追加欄が表示される。自分の課題にのみ編集・削除のアイコンが表示され、チェックボックスを操作できる。他人の課題と登録者なしの課題は操作できない。
- [x] ローカルの API 確認: 管理者以外からの他人の課題への編集・削除の要求が 403 になること(単体テストで確認し、経路の疎通はローカルで確認)。

### 実環境・ユーザー実施
- [ ] merge 前: Preview と本番の D1 に `ALTER TABLE todos ADD COLUMN created_by TEXT;` を適用する(コマンドは PR 本文に記載)。
- [ ] merge 後: 本番で、課題の追加と登録者の表示を確認する。可能であれば、管理者以外のアカウントで、他人の課題を操作できないことを確認する。
- [ ] merge 後: 既存の課題を削除し、登録し直す。
