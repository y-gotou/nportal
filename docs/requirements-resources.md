# 資料共有要件

本文書は資料共有機能のうち、ファイル配信に関する要件を定める(T-008 で新規作成した最小構成。他の要件は今後のタスクで追記する)。

## ファイル配信

- ファイル資料は R2 に保存し、`GET /api/resources/{id}/file` で認証済みユーザーへ配信する。
- 配信ヘッダー(Content-Type・Content-Disposition)は配信時に決定する(R2 オブジェクトのメタデータには依存しない)。
- ファイル種別ごとの Content-Disposition は次のとおりとする。
  - HTML: `inline`(ページとして表示する)
  - Markdown: 専用ビューアーページ(`/resources/{id}`)で表示する
  - その他(PDF・Office・画像等): `inline`(ブラウザの既定動作に委ねる)
- すべての配信に `X-Content-Type-Options: nosniff` を付与する。

### HTML 資料のサンドボックス配信

- HTML 資料の配信には `Content-Security-Policy: sandbox allow-scripts` を付与する。
- これにより投稿 HTML は不透明オリジン(opaque origin)で描画され、スクリプトは動作するが、ポータル本体の Cookie・API にはアクセスできない(投稿 HTML による持続型 XSS の防止)。
- 前提条件として、Cloudflare Access の Cookie の SameSite 属性は `Lax` 以上とする(サンドボックスからの認証付きリクエストを防ぐ)。
- 制約: 不透明オリジンでは `localStorage` 等の Web Storage へのアクセスが例外になる。try/catch なしで参照する投稿 HTML は該当スクリプトが停止する(`allow-same-origin` の追加は隔離を無効化するため行わない)。

## 資料を開くリンク

- ファイル資料の直接リンク(`/api/resources/{id}/file`)は新規タブで開く(`rel="noopener"` を付与)。
- Markdown 資料のビューアーページと関連議事録へのリンクは同一タブで開く。
- URL 資料は外部リンク動作([requirements-links.md](requirements-links.md))に従う。

## 発表応募との紐付け

- 資料は発表者募集の応募 1 件と紐付けられる(1 対 1)。紐付けの設定・解除は発表者募集側で行う([requirements-speakers.md](requirements-speakers.md) §5)。
- 紐付いた資料も資料一覧に通常どおり掲載する。紐付けがある場合のみ、カードに「発表: {応募タイトル}」をテキストで表示する(リンクにはしない)。
- 紐付け時に `presenter` と `related_minutes_slug` へ応募側の値が反映されるのは、それらが未設定の場合に限る。手動で設定した値は上書きされない。

## 対象外

- チャット添付ファイル(`GET /api/chat/messages/{id}/file`)は本要件の対象外とし、HTML を含めダウンロード形式で配信する([requirements-chat.md](requirements-chat.md) に従う)。
