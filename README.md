# N Portal

Nuxt 4 と Cloudflare Pages/D1 で構成した、社内 AI 勉強会向けの軽量ポータルです。議事録、開催スケジュール、資料共有、アンケートを 1 つのアプリで管理します。

## 技術スタック

- Nuxt 4
- Cloudflare Pages Functions
- Cloudflare D1
- 最小限の Markdown ビルドスクリプト

## セットアップ

```bash
npm install
npm run content:build
npm run db:seed:local
npm run dev
```

## 主要コマンド

```bash
npm run dev            # 議事録を生成して Nuxt 開発サーバー起動
npm run build          # Cloudflare Pages 向け本番ビルド
npm run preview        # wrangler pages dev で dist を確認
npm run typecheck      # Nuxt の型チェック
npm run check          # typecheck + build
npm run db:seed:local  # ローカル D1 を初期化
npm run db:seed:prod   # 本番 D1 を初期化
npm run db:seed:preview # Preview D1 を初期化
```

## ディレクトリ

```text
app/
  components/   UI コンポーネント
  layouts/      共通レイアウト
  pages/        Nuxt ページ
  utils/        静的コンテンツ参照ユーティリティ
content/
  minutes/      元の議事録 Markdown
  resources.json
  schedule.json
db/
  schema.sql    D1 スキーマ
  seed.sql      D1 初期データ
generated/
  minutes.json  build 時に生成される議事録 JSON
scripts/
  build-minutes.mjs
server/
  api/          Survey API
  utils/        D1 アクセス
types/
  portal.ts     共有型
wrangler.jsonc  Pages ビルド設定
```

## Cloudflare 構成

- Pages project: Cloudflare Pages 側で設定
- Production / Preview D1: Cloudflare Pages 側で binding `DB` を設定
- R2 bucket: Cloudflare Pages 側で binding `RESOURCES_BUCKET` を設定
- R2 binding: `RESOURCES_BUCKET`
- Build command: `npm run build`
- Build output directory: `dist`
- 環境変数の例: `.env.example`

## GitHub / Cloudflare 運用

1. GitHub に公開リポジトリを作成する
2. `main` ブランチを push する
3. Cloudflare Pages で GitHub リポジトリを import する
4. Preview / Production の D1 binding `DB` と R2 binding `RESOURCES_BUCKET` を紐付ける
5. `main` push で本番、PR/branch push で Preview が自動デプロイされる

社内共同管理の詳細な運用ルールは [docs/operation.md](docs/operation.md) を参照してください。

## メモ

- `generated/minutes.json` は生成物なので commit しません。
- 旧 `ai-meeting` は参照元としてのみ使い、切り替え後に削除する前提です。
