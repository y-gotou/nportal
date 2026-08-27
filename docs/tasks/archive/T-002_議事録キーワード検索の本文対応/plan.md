# T-002 実装計画

## 設計判断

- **サーバ側検索の実装位置**: 新規エンドポイントは作らず、既存の一覧 API `server/api/minutes.get.ts` にクエリパラメータ `q` を追加する。`listMinutes(db, keyword?)`(`server/utils/minutes.ts`)を拡張し、キーワード指定時は `WHERE title LIKE ?1 ESCAPE '\' OR topics LIKE ?1 ESCAPE '\' OR content_md LIKE ?1 ESCAPE '\'` で絞り込む(`%キーワード%`、`%`・`_`・`\` はエスケープ)。SQLite の LIKE は既定で ASCII 大文字小文字非区別のため要件を満たす。
- **topics の検索**: topics は JSON 文字列としてカラム格納されているため、JSON テキストへの LIKE で部分一致させる(タグ配列の展開は不要)。
- **フロントエンド**: `app/pages/minutes/index.vue` の `useFetch("/api/minutes")` にリアクティブな `q`(route.query.q 由来)を渡してサーバ絞り込み結果を取得する。`MinutesSearch.vue` からクライアント側フィルタ(`matchesKeyword`・`filteredMinutes`)を削除し、入力欄と一覧表示のみを担う構成に変更する。入力から route 反映(=再フェッチ)まで 300ms 程度のデバウンスを入れ、入力毎の過剰なリクエストを防ぐ。
- **文言**: プレースホルダを「タイトルやトピックで検索…」から本文も対象である旨が分かる文言(例「タイトル・トピック・本文で検索…」)に更新する。

## 影響範囲

- サーバ: `server/api/minutes.get.ts`、`server/utils/minutes.ts`(listMinutes)
- 画面: `app/pages/minutes/index.vue`、`app/components/minutes/MinutesSearch.vue`
- データ・スキーマ: 変更なし
- 恒久仕様書: `docs/requirements-minutes.md`(新規作成。T-003 が先行した場合は節追加)

## 作業項目

- [x] 1. `listMinutes` のキーワード検索対応(LIKE エスケープ含む)と単体テスト追加
- [x] 2. 一覧 API への `q` パラメータ追加と、一覧ページ・検索コンポーネントのサーバ検索への切り替え(プレースホルダ更新含む)
- [x] 3. `docs/requirements-minutes.md` の作成(検索仕様の記載)と changelog 起案

## 検証方法

### エージェント実施
- [x] `npm run check`(型チェック・ビルド)
- [x] `npm test`(listMinutes 検索の単体テスト: 本文のみ一致・タイトル/トピック一致・大文字小文字非区別・エスケープ文字・0件)
- [x] `npm run dev` + モックログインでのブラウザ確認(本文のみに含まれる語での検索、該当なし表示、URL の q 引き継ぎ)

### 実環境・ユーザー実施
- [ ] なし
