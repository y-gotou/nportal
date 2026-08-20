# N Portal

Nuxt 4 と Cloudflare Pages/D1 で構成した、社内 AI 勉強会向けの軽量ポータルです。議事録、開催スケジュール、資料共有、アンケート、会議チャット、AI ニュースを 1 つのアプリで管理します。

会議チャットは会議(スケジュール)ごとのルームにテキスト・画像・ファイル・スタンプを投稿でき、ポーリング+バージョン番号方式(変更がなければ 204 応答)で通信量を抑えています。要件・設計は [docs/requirements-chat.md](docs/requirements-chat.md) を参照してください。本文に `@AI` を含めて投稿すると社内 LLM が返信します([docs/chat-ai.md](docs/chat-ai.md))。

AI ニュースは Claude の routine が毎朝自動で収集・選定・要約して掲載し、木曜朝には過去 7 日の週次ダイジェストを生成します。閲覧者の 👍 / 👎 評価は次回以降の選定に反映されます。要件は [docs/requirements-news.md](docs/requirements-news.md)、routine の手順は [docs/news-routine.md](docs/news-routine.md) を参照してください。

社内 LLM(OpenAI 互換 API)へのプロキシ API(`/api/llm/*`)を備えています。構成と運用は [docs/llm-proxy.md](docs/llm-proxy.md) を参照してください。

## 技術スタック

- Nuxt 4
- Cloudflare Pages Functions
- Cloudflare D1
- 最小限の Markdown ビルドスクリプト

## セットアップ(ローカル確認環境)

```bash
npm install
# ローカル専用の wrangler.jsonc を作成(下記参照。Git 管理外)
npm run db:seed:local   # ローカル D1 を初期化
npm run dev             # http://localhost:3000
```

リポジトリ直下に次の内容で `wrangler.jsonc` を作成します(`.gitignore` 済み)。D1 / R2 はローカルエミュレーションで動くため実 ID は不要です。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "nportal-local",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2026-03-31",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "MOCK_USER_EMAIL": "dev@example.com",
    "ADMIN_EMAILS": "dev@example.com",
    "RESOURCE_OBJECT_PREFIX": "local"
  },
  "r2_buckets": [
    { "binding": "RESOURCES_BUCKET", "bucket_name": "nportal-resources-local" }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "nportal-local",
      "database_id": "00000000-0000-0000-0000-000000000000"
    }
  ]
}
```

- 認証は `MOCK_USER_EMAIL` によるモックログインで通過します(`.dev.vars` に同名の設定があればそちらが優先)。
- `db:seed:local` は `wrangler.jsonc` の `database_name`(`nportal-local`)を既定で使います。
- 社内 LLM を使う機能(`/api/llm/*`、会議チャットの `@AI`)をローカルで動かすには `.dev.vars` に `LLM_API_BASE_URL` / `LLM_CF_ACCESS_CLIENT_ID` / `LLM_CF_ACCESS_CLIENT_SECRET` を設定します([docs/llm-proxy.md](docs/llm-proxy.md))。ニュース取込 API の検証には `NEWS_INGEST_TOKEN`(ローカルでは任意の値)を設定します。
- 本番相当の構成で確認する場合は `npm run preview` を使います。

## 主要コマンド

```bash
npm run dev            # 議事録を生成して Nuxt 開発サーバー起動
npm run build          # Cloudflare Pages 向け本番ビルド
npm run preview        # wrangler pages dev で dist を確認
npm run typecheck      # Nuxt の型チェック
npm run check          # typecheck + build
npm run db:seed:local   # ローカル D1 を初期化(既存データを削除して初期データを投入)
npm run db:schema:local  # ローカル D1 にスキーマのみ適用
npm run db:schema:prod   # 本番 D1 にスキーマのみ適用(テーブル追加の反映に使う)
npm run db:schema:preview # Preview D1 にスキーマのみ適用
```

> **注意**: `db/seed.sql` はアンケート関連の既存データを DELETE してから投入する破壊的スクリプトです。
> リモート(本番/Preview)へのテーブル追加は `db:schema:prod` / `db:schema:preview` を使ってください
> (`schema.sql` は `CREATE TABLE IF NOT EXISTS` のみで既存データに影響しません)。
> リモートへの seed 実行はスクリプト側でも拒否されます。

## ディレクトリ

```text
app/
  components/   UI コンポーネント
  composables/  クライアント共有ロジック
  layouts/      共通レイアウト
  pages/        Nuxt ページ
  utils/        表示用ユーティリティ(ラベル・配色・更新履歴データ)
db/
  schema.sql    D1 スキーマ
  seed.sql      D1 初期データ(ローカル専用・既存データを削除して投入)
scripts/        ニュース収集 routine・D1 実行スクリプト
server/
  api/          Survey API・LLM プロキシほか
  utils/        D1 アクセス・LLM 転送
shared/
  utils/        app と server の双方から使う純粋ユーティリティ
tests/          node:test によるユニットテスト
types/
  portal.ts     共有型
wrangler.example.jsonc  Pages/D1/R2 設定例
```

## Cloudflare 構成

- Pages project: Cloudflare Pages 側で設定
- Production / Preview D1: Cloudflare Pages 側で binding `DB` を設定
- R2 bucket: Cloudflare Pages 側で binding `RESOURCES_BUCKET` を設定
- R2 binding: `RESOURCES_BUCKET`
- Build command: `npm run build`
- Build output directory: `dist`
- 環境変数の例: `.env.example`

`wrangler.jsonc` をリポジトリに配置すると、Cloudflare Pages の dashboard 側 bindings を上書きする可能性があります。公開リポジトリでは実設定を Git 管理せず、Cloudflare Pages 側で環境変数と bindings を管理します。

## GitHub / Cloudflare 運用

1. GitHub に公開リポジトリを作成する
2. `main` ブランチを push する
3. Cloudflare Pages で GitHub リポジトリを import する
4. Preview / Production の D1 binding `DB` と R2 binding `RESOURCES_BUCKET` を紐付ける
5. `main` push で本番、PR/branch push で Preview が自動デプロイされる

社内共同管理の詳細な運用ルールは [docs/operation.md](docs/operation.md) を参照してください。

## メモ

- 旧 `ai-meeting` は参照元としてのみ使い、切り替え後に削除する前提です。
