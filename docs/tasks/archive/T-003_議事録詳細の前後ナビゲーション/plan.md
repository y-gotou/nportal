# T-003 実装計画

## 設計判断

- **前後の導出**: 専用カラムは追加せず、`getMinutesDetail`(`server/utils/minutes.ts`)内で日付を基準に導出する。`SELECT slug, title, date FROM minutes WHERE date < ?(> ?) ORDER BY date DESC(ASC) LIMIT 1` の2クエリで前(過去方向)・次(未来方向)を取得する(既存インデックス idx_minutes_date を利用)。
- **API・型**: `Minutes` 型(`types/portal.ts`)に `prev` / `next`(`{ slug, title, date } | null`)を追加し、詳細 API `/api/minute` のレスポンスに含める。一覧 API は変更しない。
- **UI**(2026-08-27 ユーザー決定): `app/pages/minutes/[slug]/index.vue` に以下の2箇所を追加する。ボタンはいずれも既存と同じ見た目(secondaryButtonClass)、名称は「← 前の議事録」「次の議事録 →」(日付・タイトルの併記なし)。存在しない側は非表示。
  - 上部: 既存ボタン列を左右に分割し、左に「← 一覧へ戻る」「チャットを見る」、右端に「← 前の議事録」「次の議事録 →」を配置する。
  - 下部: ページ末尾(関連資料セクションの下)に同じボタンを再掲し、左端に「← 前の議事録」、右端に「次の議事録 →」を配置する。

## 影響範囲

- サーバ: `server/utils/minutes.ts`(getMinutesDetail)
- 型: `types/portal.ts`(Minutes)
- 画面: `app/pages/minutes/[slug]/index.vue`
- データ・スキーマ: 変更なし
- 恒久仕様書: `docs/requirements-minutes.md`(前後ナビゲーション節の追加。未作成なら T-002 の方針で新規作成)

## 作業項目

- [x] 1. `getMinutesDetail` の前後導出追加・型拡張と単体テスト追加
- [x] 2. 詳細ページへの前後リンク実装(上部・本文末尾)
- [x] 3. `docs/requirements-minutes.md` への仕様反映と changelog 起案

## 検証方法

### エージェント実施
- [x] `npm run check`(型チェック・ビルド)
- [x] `npm test`(前後導出の単体テスト: 中間・最古・最新・1件のみ)
- [x] `npm run dev` + モックログインでのブラウザ確認(中間の議事録で上下2箇所の前後リンクと遷移、最古・最新での非表示)

### 実環境・ユーザー実施
- [ ] なし
