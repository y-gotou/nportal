# T-017 実装計画

## 設計判断

- **スキーマ**: `db/schema.sql` の `schedule` に `agenda TEXT`(NULL 許容)を追加する。既存テーブルへの適用は `ALTER TABLE schedule ADD COLUMN agenda TEXT;` の1文(ローカル D1 はエージェント、本番 D1 はユーザーが適用)。`npm run db:schema:prod` は `CREATE TABLE IF NOT EXISTS` のみのため、既存テーブルには列が追加されない。
- **本番適用の順序**: 実装 PR の merge 前に本番 D1 へ列を追加する。現行コードは INSERT / UPDATE で列を明示しており、追加列の影響を受けない。逆順(merge が先)では、列が無い間スケジュールの作成・更新が 500 になる。
- **型**: `types/portal.ts` の `ScheduleItem` に `agenda?: string | null` を追加する。
- **保存**: `server/utils/schedule.ts` の `parseSchedulePayload` で議題を整形する。文字列なら前後の空白を除去し、空または文字列以外は `null` とする。`createScheduleItem` / `updateScheduleItem` の SQL に列を追加する。API ルート(`server/api/admin/schedule/`)は `parseSchedulePayload` 経由のため変更しない。
- **取得**: 一覧は `SELECT schedule.*` のため SQL は変更せず、`toScheduleItem` で `agenda` を返す。値が無い行は `null` とする。
- **入力欄**: `app/components/admin/AdminScheduleForm.vue` に `<textarea>` を追加する(トピックの下)。文字数上限は設けない(既存のスケジュール項目に上限が無く、入力者は管理者のみのため)。
- **表示**: HTML 標準の `<details>` / `<summary>` を使う。開閉に JavaScript を使わない。本文は `{{ }}` で出力し(Vue が HTML をエスケープする)、`whitespace-pre-wrap` で改行を保持する。
- **部品化**: 表示箇所が3か所(`/schedule` の今後の予定・開催済み、トップページ)あるため、`app/components/ScheduleAgenda.vue` に切り出す。議題が無い場合は何も描画しない。見た目の調整を1か所で済ませる目的であり、配色は背景(カードは明色、トップページのヒーロー部は暗色)に合わせて親から class で指定する。
- **配置**: `/schedule` のカードではトピックのタグの下、トップページでは開催日時・テーマの下(ボタン列の上)に置く。ボタン列の中に置くと、開いたときに横並びのボタンが崩れるため。配置と見た目はユーザー確認で調整する。

## 影響範囲

- データ: `schedule`(列追加。本番適用はユーザー実施)
- サーバ: `server/utils/schedule.ts`
- 型: `types/portal.ts`(`ScheduleItem`)
- 画面: `app/components/ScheduleAgenda.vue`(新規)、`app/pages/schedule.vue`、`app/pages/index.vue`、`app/components/admin/AdminScheduleForm.vue`
- 共通: `app/utils/changelog.ts`(更新履歴)
- テスト: `tests/minutes-schedule-utils.test.ts`
- 恒久仕様書: `docs/requirements-schedule.md`(新規)

## 作業項目

- [x] 1. スキーマ更新とローカル D1 への列追加、型・保存・取得の実装(単体テスト追加)
- [x] 2. 管理フォームへの議題欄の追加
- [ ] 3. 表示部品の作成と `/schedule`・トップページへの組み込み。スクリーンショットとローカル画面でユーザーに見た目を確認してもらい、指摘を反映する
- [ ] 4. 恒久仕様書の新規作成、changelog 追記の起案、本番用 SQL の提示

## 検証方法

### エージェント実施
- [x] `npm test`(議題の前後空白の除去、空・文字列以外が未設定になること、一覧が議題を返すこと、議題の値が無い行が `null` になること)
- [x] `npm run check`(型チェック・ビルド)
- [x] `npm run dev` + モックログインでのブラウザ確認(管理画面で改行を含む議題を保存し再編集で同内容が出ること、`/schedule` の今後の予定・開催済みとトップページでの開閉、未入力の回に開閉要素が出ないこと、空で保存すると消えること、HTML タグが文字列で出ること、既存項目の表示に変化がないこと、ライト・ダーク両テーマ)

### 実環境・ユーザー実施
- [ ] 見た目の確認(作業項目 3 の途中)
- [ ] 本番 D1 への列追加(提示 SQL を merge 前に実行)
- [ ] 本番画面での議題の保存・表示の確認
