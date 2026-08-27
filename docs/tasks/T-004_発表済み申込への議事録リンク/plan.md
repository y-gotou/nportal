# T-004 実装計画

## 設計判断

- **スキーマ**: `db/schema.sql` の speaker_applications に `minutes_slug TEXT`(NULL 許容)を追加。適用は `ALTER TABLE speaker_applications ADD COLUMN minutes_slug TEXT;` の1文(ローカル D1 はエージェントが適用、本番 D1 はユーザーが適用)。外部キー制約は付けない(minutes.slug は PRIMARY KEY でないうえ、既存スキーマも参照制約を使わない方針のため)。
- **API**: 既存の管理者用 `PUT /api/admin/speakers/[id]`(`server/api/admin/speakers/[id].put.ts`)のボディに `minutes_slug`(string | null)を追加する。`server/utils/speakers.ts` の `adminUpdateSpeakerStatus` を status・minutes_slug の部分更新に対応する形へ拡張し、`toApplication`・`SpeakerApplication` 型(`types/portal.ts`)に `minutesSlug` を追加する。値は日付形式(DATE_PATTERN)で検証し、null で紐付け解除。一般ユーザー用 PUT(本人編集)では minutes_slug を受け付けない。
- **管理画面**: `app/pages/admin/speakers.vue` で `/api/minutes` から議事録一覧を取得し、各行のステータス `<select>` の右に議事録選択 `<select>`(先頭に「紐付けなし」、以降は日付+タイトル、日付降順)を追加。変更時に既存のステータス変更と同様 PUT で保存する。
- **公開側**: `app/pages/speakers.vue` の申込カードで `minutesSlug` が設定されている場合のみ `/minutes/{minutesSlug}` への「議事録を見る」リンクを表示する。

## 影響範囲

- データ: speaker_applications テーブル(カラム追加。本番適用はユーザー実施)
- サーバ: `server/api/admin/speakers/[id].put.ts`、`server/utils/speakers.ts`
- 型: `types/portal.ts`(SpeakerApplication)
- 画面: `app/pages/admin/speakers.vue`、`app/pages/speakers.vue`
- 恒久仕様書: `docs/requirements-speakers.md`(§2 変更・紐付け節の新設)

## 作業項目

- [x] 1. スキーマ更新・ローカル D1 へのマイグレーション適用と、管理者用更新 API の minutes_slug 対応(単体テスト追加)
- [x] 2. 管理画面への議事録ドロップダウン追加と公開側カードのリンク表示
- [x] 3. `docs/requirements-speakers.md` への仕様反映と changelog 起案、本番用マイグレーションコマンドの提示

## 検証方法

### エージェント実施
- [x] `npm run check`(型チェック・ビルド)
- [x] `npm test`(管理者用更新の単体テスト: 紐付け設定・解除・形式不正・status との同時/単独更新)
- [x] `npm run dev` + モックログインでのブラウザ確認(管理画面での選択→公開側カードのリンク表示・遷移、解除でリンク消滅)

### 実環境・ユーザー実施
- [ ] 本番 D1 へのマイグレーション適用(提示コマンドをユーザーが実行)
- [ ] 本番画面での紐付け設定とリンク表示の確認
