---
id: T-008
title: HTML資料のページ表示
scale: medium
status: done
priority: mid
updated: 2026-08-28
approvals:
  spec: 2026-08-28
  plan: 2026-08-28
  done: 2026-08-28
---
# HTML資料のページ表示

## 目的・背景

資料共有ページに投稿された HTML ファイルは、現在 `Content-Disposition: attachment` で配信されるため、一度ダウンロードしてから開く必要がある。この挙動は HTML 投稿許可時(コミット `aa95650`)に意図的に導入されたもので、投稿 HTML をポータルと同一オリジンで表示すると閲覧者の認証状態で任意スクリプトが実行される持続型 XSS を防ぐための措置である。

`Content-Security-Policy: sandbox allow-scripts` レスポンスヘッダーを付与して不透明オリジン(opaque origin)で描画させることで、ポータル本体から隔離したままページとして閲覧可能にする。実際に投稿されている HTML 資料(自己展開型バンドル形式)は JavaScript 必須のため、`allow-scripts` を採用する(方式はユーザー承認済み)。

## 確定要件

- 資料共有の HTML ファイル配信(`GET /api/resources/{id}/file`)を、`Content-Disposition: inline` + `Content-Security-Policy: sandbox allow-scripts` に変更し、ブラウザでページとして表示できるようにする。
- 資料共有ページの「資料を開く」リンクは、ファイル資料について新規タブで開くようにする。
- 配信済み・投稿済みの既存ファイルにも適用する(配信時にヘッダーを決定しているため、データ移行は行わない)。

### 前提条件(実環境・ユーザー実施)

- Cloudflare Access の `CF_Authorization` Cookie の SameSite 属性が `Lax` または `Strict` であることを確認する(Admin 実施)。`None` の場合は、Access 側の設定変更またはサーバー側の `Sec-Fetch-Site` 検証追加を別途検討する(結果により本タスクの要件へ追記)。

### 対象外

- チャット添付ファイル(`GET /api/chat/messages/{id}/file`)は現行どおりダウンロード形式を維持する(`docs/requirements-chat.md` の定めに従う)。
- HTML 以外のファイル種別の配信挙動は変更しない。

## 受入条件

- HTML 資料の配信レスポンスに `Content-Disposition: inline` と `Content-Security-Policy: sandbox allow-scripts` が付与される(ユニットテストで検証)。
- HTML 以外(PDF・Markdown 等)およびチャット添付の配信ヘッダーは現行から変化しない(ユニットテストで検証)。
- ローカル環境で HTML ファイルを投稿し、「資料を開く」から新規タブでページとして表示される(ブラウザ確認)。
- サンドボックス内から親オリジンの Cookie・API にアクセスできないこと(不透明オリジンで描画されること)をブラウザ確認する。
- `npm test` と `npm run check` が通る。

## 仕様書反映

対象機能の恒久仕様書(`docs/requirements-resources.md`)が存在しないため、本タスクで最小限の要件文書を新規作成し、ファイル配信仕様(種別ごとの Content-Disposition と HTML の CSP sandbox 配信)を記載する。
