# 社内 LLM プロキシ API

- 作成日: 2026-07-08
- 対応 PR: #38

## 概要

ポータルから社内 LLM(OpenAI 互換 API)を利用するためのサーバープロキシです。社内 LLM サーバーはインターネットに直接公開せず、次の経路で接続します。

```
Pages Functions (/api/llm/*)
  → Cloudflare Access(サービストークン認証付き公開ホスト名)
  → Cloudflare Tunnel(LLM サーバー上の cloudflared が外向きに接続)
  → 社内 LLM(OpenAI 互換 API)
```

サービストークンを持たないリクエストは Cloudflare Access が 401 で遮断するため、この API を経由する以外の方法で社内 LLM へ到達することはできません。

## エンドポイント

| メソッド | パス | 内容 |
| --- | --- | --- |
| POST | `/api/llm/chat` | リクエストボディを上流の `/v1/chat/completions` へそのまま転送します。`stream: true` の SSE ストリーミングもパススルーされます |
| GET | `/api/llm/models` | 上流の `/v1/models` を返します(疎通確認用) |

いずれも既存の認証ミドルウェア(`server/middleware/auth.ts`)の対象であり、Cloudflare Access でログイン済みのユーザーのみ利用できます。

## 実装

| ファイル | 役割 |
| --- | --- |
| `server/utils/llm.ts` | 環境変数の検証と、サービストークンヘッダー付きで上流へ転送する `llmFetch` / レスポンスをそのまま返す `passthroughResponse` |
| `server/api/llm/chat.post.ts` | チャット補完プロキシ |
| `server/api/llm/models.get.ts` | モデル一覧プロキシ |

## 環境変数

実値は Git 管理せず、Cloudflare Pages 側の環境変数を正とします(production / preview 設定済み)。未設定の場合、API は 503 を返します。

| 変数 | 内容 |
| --- | --- |
| `LLM_API_BASE_URL` | 社内 LLM の公開ホスト名(Access 保護付き)のベース URL |
| `LLM_CF_ACCESS_CLIENT_ID` | Access サービストークンのクライアント ID |
| `LLM_CF_ACCESS_CLIENT_SECRET` | Access サービストークンのクライアントシークレット |

## ローカル開発

`.dev.vars` に上記 3 変数を設定します。社内 LAN から LLM サーバーへ直接到達できる場合は、`LLM_API_BASE_URL` に LAN 上の URL を設定し、クライアント ID / シークレットはダミー値で構いません(Access を経由しない場合、ヘッダーは上流で無視されます)。

## 運用

- サービストークンの有効期間は 1 年です。失効前に Cloudflare Zero Trust ダッシュボードでローテーションし、Pages の環境変数を更新してください。
- サーバー側(Tunnel・cloudflared・Access アプリ)の構成と運用手順は、社内 llm-server リポジトリの `docs/operations.md` を参照してください。
