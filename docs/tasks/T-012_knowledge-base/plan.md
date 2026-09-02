# T-012 実装計画

## 設計判断

### Markdown 変換の共通化

`server/utils/minutes.ts` の `renderMarkdown`(remark + gfm + html)と `escapeLikePattern` を `server/utils/markdown.ts` へ移設し、議事録とナレッジの双方から import する。移設対象は 2 関数のみで、`minutes.ts` 側は import 経由の参照に置き換える。

- 代替案: `minutes.ts` からそのまま import する。実装は最小だが、議事録固有モジュールへの依存が生じ、ナレッジ側の変換仕様変更が議事録に波及したときの影響範囲が読みにくくなるため採らない。

### 本文 HTML の保存

議事録(`minutes.content_md` / `content_html`)と同様に、記事保存時にサーバー側で HTML へ変換し `content_md` と `content_html` の双方を保持する。表示時の変換コストが不要になり、プレビュー API と保存時で同一の `renderMarkdown` を通すため両者のレンダリング結果が一致する。

- 代替案: `content_md` のみ保持し表示時に都度変換する。保存容量は減るが、一覧・詳細の応答ごとに変換が走る。PoC の記事件数では差は小さいが、議事録と方式を揃える利点を優先する。

### プレビュー API

`POST /api/knowledge/preview` は本文の Markdown を受け取り HTML を返すだけの stateless なエンドポイントとする。`requireUser` で認証のみ確認し、記事 ID は要求しない。クライアント側は入力停止から 300ms のデバウンスを挟み、進行中のリクエストがあれば中断する(`AbortController`)。

### 編集 UI の形態

エディタとプレビューの並置には横幅が必要なため、モーダルではなく専用ページとする(`/knowledge/new`、`/knowledge/[id]/edit`)。狭幅ではタブ切替へフォールバックする。

### 権限判定

`server/utils/knowledge.ts` に `getEditableArticleRow(event, articleId, user)` を置き、投稿者本人(`user_email` 一致)または管理者(`ADMIN_EMAILS` に含まれる)のときのみ行を返し、それ以外は 403 を送出する。既存の `requireUser` / `assertAdmin` を組み合わせる形とし、資料機能の `getEditableResourceRow` と同じ構造にする。

### カテゴリの配色

`app/utils/knowledge.ts` に配色キー(`blue` / `green` / `amber` / `rose` / `violet` / `slate` の 6 種)と Tailwind クラス文字列の対応表を定義し、`knowledgeCategoryClass(colorKey)` で解決する。既存の `app/utils/status.ts` と同じく light / dark 両対応のクラス文字列を返す。DB のカテゴリ行は配色キーのみを持ち、未知のキーはフォールバック配色(`slate`)で表示する。

### 画像の取り扱い(第 2 弾)

資料機能の Markdown 投稿と同方式を踏襲する。

- 本文の Markdown には画像のファイル名を参照として書き、記事の保存時に multipart で本文と画像を同時送信する。これにより、記事 ID が未確定な新規作成時にも画像を扱える。
- 表示時は `server/utils/resource-markdown.ts` の `resolveMarkdownImageSources` を汎用化(URL 生成関数を引数化)し、`knowledge_images` の行から `/api/knowledge/[id]/images/[imageId]` へ解決する。
- 代替案: アップロード時に R2 キーを確定して本文へ URL を直書きする。実装は軽いが、記事 ID の確定前にアップロードが必要となり、保存されなかった記事の画像が孤児として残る。採らない。

### タグの正規化(第 2 弾)

`shared/utils/` に正規化関数を置き、app / server の双方から使う。正規化は「前後空白の除去 → 全角英数の半角化 → 英字の小文字化」の順とする。`knowledge_tags` は正規化後の値を UNIQUE 制約付きで保持し、表示は入力時の原文ではなく正規化後の値とする(表記ゆれの統合を優先)。

## 影響範囲

### データ

第 1 弾で追加:

- `knowledge_categories`(id, name, color_key, sort_order, created_at)
- `knowledge_articles`(id, title, summary, content_md, content_html, category_id, schedule_id, user_email, created_at, updated_at)
- インデックス: `knowledge_articles(updated_at)`、`knowledge_articles(category_id)`

第 2 弾で追加:

- `knowledge_tags`(id, name)— name に UNIQUE
- `knowledge_article_tags`(article_id, tag_id)— 複合 PRIMARY KEY
- `knowledge_images`(id, article_id, file_key, file_name, file_size, mime_type, created_at)

`schedule_id` は第 1 弾からスキーマに含めるが、UI での設定・表示は第 2 弾で行う。

### サーバー

- 新規: `server/utils/markdown.ts`(移設)、`server/utils/knowledge.ts`
- 新規: `server/api/knowledge/`(index.get / index.post / [id].get / [id].put / [id].delete / preview.post)、第 2 弾で `[id]/images/[imageId].get`、`tags.get`
- 新規: `server/api/admin/knowledge-categories/`(index.get / index.post / [id].put / [id].delete)
- 変更: `server/utils/minutes.ts`(2 関数を `markdown.ts` から import)、`server/utils/resource-markdown.ts`(URL 生成の引数化)

### 画面

- 新規: `app/pages/knowledge/index.vue`、`[id].vue`、`new.vue`、`[id]/edit.vue`
- 新規: `app/components/knowledge/`(記事カード、エディタ+プレビュー、カテゴリバッジ、タグ入力)
- 新規: `app/utils/knowledge.ts`
- 新規: `app/pages/admin/knowledge-categories.vue`、`app/components/admin/` へカテゴリ編集フォーム
- 変更: `app/pages/index.vue`(新着記事、第 2 弾)、`app/pages/admin/index.vue`(カテゴリ管理への導線)、`types/portal.ts`
- 変更: 勉強会回の詳細表示に関連記事一覧を追加(第 2 弾)

### 恒久仕様書

- 新規: `docs/requirements-knowledge.md`(第 1 弾で §1〜§4、第 2 弾で §5〜§7)
- 変更: `docs/requirements-chat.md`(画像制限の共用に関する注記、第 2 弾)
- 変更: `app/utils/changelog.ts`(各弾のマージ時に feature を 1 件ずつ)

## 作業項目

### モックアップ(実装着手前)

- [ ] 1. 一覧・詳細・編集(エディタ+プレビュー)・管理画面カテゴリの 4 画面を Artifact のモックアップとして作成し、ユーザーの確認を得る。指摘があれば反映し、画面構成・情報設計を確定してから第 1 弾の実装に入る。

### 第 1 弾(PR その 1)

- [ ] 2. `db/schema.sql` にカテゴリ・記事のテーブルを追加し、`types/portal.ts` に型を追加。`server/utils/markdown.ts` を新設して `renderMarkdown` / `escapeLikePattern` を移設し、`minutes.ts` を追随させる。ローカル D1 へ適用。
- [ ] 3. `server/utils/knowledge.ts` と記事 API(一覧・詳細・作成・更新・削除・プレビュー)を実装。入力検証(必須・文字数上限)と権限判定を含む。ユニットテストを追加。
- [ ] 4. カテゴリ管理 API(admin)を実装。記事が属するカテゴリの削除拒否を含む。ユニットテストを追加。
- [ ] 5. 公開画面(一覧・詳細・新規作成・編集)を実装。`app/utils/knowledge.ts` の配色パレットと、エディタ+プレビューのデバウンス連携を含む。
- [ ] 6. 管理画面のカテゴリ管理を実装し、管理トップへ導線を追加。
- [ ] 7. `docs/requirements-knowledge.md` §1〜§4 を作成し、`app/utils/changelog.ts` へ追記を起案。`npm test` / `npm run check` を通す。

### 第 2 弾(PR その 2)

- [ ] 8. タグのテーブルと正規化関数(`shared/utils/`)を追加し、記事 API をタグ対応に拡張。タグ候補 API を追加。ユニットテストを追加。
- [ ] 9. 一覧のキーワード検索(LIKE)とカテゴリ・タグ絞り込みを実装。
- [ ] 10. 画像アップロード(`knowledge_images`、R2、multipart 受信、表示時の src 解決)を実装。`resolveMarkdownImageSources` の汎用化を含む。ユニットテストを追加。
- [ ] 11. 勉強会回との双方向表示とトップページの新着記事表示を実装。
- [ ] 12. `docs/requirements-knowledge.md` §5〜§7 と `docs/requirements-chat.md` の注記を追加し、`app/utils/changelog.ts` へ追記を起案。`npm test` / `npm run check` を通す。

## 検証方法

### エージェント実施

- [ ] `npm test`(記事・カテゴリの入力検証、権限判定、カテゴリ削除制約、Markdown 変換、タグ正規化、検索の LIKE エスケープ、画像の src 解決)
- [ ] `npm run check`(型チェック + ビルド)
- [ ] ローカルブラウザ確認(第 1 弾): 記事の投稿・編集・削除、プレビューの追随、他ユーザーからの編集不可、カテゴリの追加・変更・削除と削除拒否
- [ ] ローカルブラウザ確認(第 2 弾): タグの入力と候補表示、キーワード検索と絞り込み、画像のペースト・ドロップと表示、記事削除時の画像削除、勉強会回との相互遷移、トップページの新着表示

### 実環境・ユーザー実施

- [ ] モックアップ(作業項目 1)の確認と画面構成の承認
- [ ] 本番 D1 および preview D1 へのマイグレーション適用(各弾のマージ前)
- [ ] PR のマージと Cloudflare Pages の production デプロイ確認
- [ ] 本番環境での動作確認(各弾)
