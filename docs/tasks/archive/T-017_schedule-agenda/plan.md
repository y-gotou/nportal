# T-017 実装計画

## 設計判断

- **スキーマ**: `db/schema.sql` の `schedule` に `agenda TEXT`(Markdown の原文)と `agenda_html TEXT`(変換済み HTML)を追加する。いずれも NULL 許容。議事録の `content_md` / `content_html` と同じく、保存時に変換して両方を持つ。既存テーブルへの適用は次の2文(ローカル D1 はエージェント、本番 D1 はユーザーが適用)。
  - `ALTER TABLE schedule ADD COLUMN agenda TEXT;`
  - `ALTER TABLE schedule ADD COLUMN agenda_html TEXT;`
  - `npm run db:schema:prod` は `CREATE TABLE IF NOT EXISTS` のみのため、既存テーブルには列が追加されない。上記の2文を別途実行する。
- **本番適用の順序**: 実装 PR の merge 前に本番 D1 へ列を追加する。現行コードは INSERT / UPDATE で列を明示しており、追加列の影響を受けない。逆順(merge が先)では、列が無い間スケジュールの作成・更新が 500 になる。
- **型**: `types/portal.ts` の `ScheduleItem` に `agenda?: string | null`(原文。管理フォームの再編集と、ボタン表示の判定に使う)と `agendaHtml?: string | null` を追加する。
- **保存**: `server/utils/schedule.ts` の `parseSchedulePayload` で議題を整形する。文字列なら前後の空白を除去し、空または文字列以外は `null` とする。`createScheduleItem` / `updateScheduleItem` で、議題があれば `server/utils/minutes.ts` の既存関数 `renderMarkdown`(remark + GFM。既定でサニタイズされる)で HTML に変換し、原文と併せて保存する。議題が無ければ両方 `null` とする。API ルート(`server/api/admin/schedule/`)は `parseSchedulePayload` 経由のため変更しない。
- **取得**: 一覧は `SELECT schedule.*` のため SQL は変更せず、`toScheduleItem` で `agenda` と `agendaHtml` を返す。値が無い行は `null` とする。
- **入力欄**: `app/components/admin/AdminScheduleForm.vue` に `<textarea>` を追加する(トピックの下)。ラベルは議事録フォームの「本文（Markdown）」に倣い「議題（Markdown）」とする。文字数上限は設けない(既存のスケジュール項目に上限が無く、入力者は管理者のみのため)。
- **議題ページ**: `app/pages/schedule/[id].vue` を新設し、URL は `/schedule/{id}` とする(チャットの `/chat/{scheduleId}` と同じく回の ID を使う)。構成は議事録詳細ページに倣い、「一覧へ戻る」、タイトル、開催日時・開催場所・トピック、本文のカードとする。本文は議事録と同じく、変換済み HTML を `v-html` で出力し、既存の `.prose` スタイルを適用する。
- **ルーティング**: Nuxt では `schedule.vue` と `schedule/` ディレクトリが併存すると前者が親ルートになるため、`app/pages/schedule.vue` を `app/pages/schedule/index.vue` へ移動する(内容は変更しない。アンケートの `survey/index.vue` と同じ構成)。
- **データ取得**: 既存の一覧 API(`/api/schedule`)を取得して ID で絞り込む。管理画面の編集ページと同じ方式で、1件取得用の API は追加しない(回数が少なく、一覧の取得で足りるため)。ID が不正または該当なしの場合は 404 とし、議題が未設定の場合は未登録の旨を表示する。
- **導線**: `/schedule` の各カードとトップページのボタン列に、チャットのボタンの左へ「議題」の `NuxtLink` を置く(議題がある回のみ)。見た目は並びのボタンと同じ class を使う。リンクのみのため部品化はしない。
- **経緯**: 当初は `<details>` による展開式、次に Popover API による重ね表示(`app/components/ScheduleAgenda.vue`)を実装したが、会議中に別ウィンドウで開いて画面共有する用途のため、単独ページへ変更した。`ScheduleAgenda.vue` は削除する。

## 影響範囲

- データ: `schedule`(列追加。本番適用はユーザー実施)
- サーバ: `server/utils/schedule.ts`
- 型: `types/portal.ts`(`ScheduleItem`)
- 画面: `app/pages/schedule/[id].vue`(新規)、`app/pages/schedule/index.vue`(`app/pages/schedule.vue` から移動)、`app/pages/index.vue`、`app/components/admin/AdminScheduleForm.vue`、`app/components/ScheduleAgenda.vue`(削除)
- 共通: `app/utils/changelog.ts`(更新履歴)
- テスト: `tests/minutes-schedule-utils.test.ts`
- 恒久仕様書: `docs/requirements-schedule.md`(新規)

## 作業項目

- [x] 1. スキーマ更新とローカル D1 への列追加、型・保存・取得の実装(単体テスト追加)
- [x] 2. 管理フォームへの議題欄の追加
- [x] 3. 議題ページの新設と `/schedule`・トップページへの「議題」ボタンの組み込み(重ね表示の部品は削除)。スクリーンショットとローカル画面でユーザーに見た目を確認してもらい、指摘を反映する
- [x] 4. 恒久仕様書・changelog の文言を単独ページの仕様に合わせて更新、本番用 SQL の提示

## 検証方法

### エージェント実施
- [x] `npm test`(議題の前後空白の除去、空・文字列以外が未設定になること、一覧が議題の原文と HTML を返すこと、値が無い行が `null` になること、作成・更新時に Markdown が HTML へ変換されて保存され `<script>` が除去されること、議題が無いとき HTML も `null` になること)
- [x] `npm run check`(型チェック・ビルド)
- [x] `npm run dev` + モックログインでのブラウザ確認(管理画面で改行を含む議題を保存し再編集で同内容が出ること、`/schedule` の今後の予定・開催済みとトップページの「議題」ボタンから議題ページへ移動できること、議題ページの URL を直接開けること、未入力の回にボタンが出ないこと、未入力の回の議題ページで未登録の旨が出ること、存在しない回で 404 になること、空で保存すると消えること、Markdown の見出し・箇条書き・リンクが表示されること、`<script>` が出力されないこと、既存項目の表示に変化がないこと、`/schedule` の一覧が移動後も同じ表示であること、ウィンドウ幅を半分にした表示、ライト・ダーク両テーマ)

### 実環境・ユーザー実施
- [x] 見た目の確認(作業項目 3 の途中)
- [x] 本番 D1 への列追加(提示 SQL 2文を merge 前に実行)
- [x] 本番画面での議題の保存・表示の確認
