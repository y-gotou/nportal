# T-008 作業ログ

## 引き継ぎサマリ
- 現状: PR #87 作成済み。Preview でユーザーが JS 付き HTML(自己展開型バンドル)の表示を確認済み(2026-08-28)。マージ待ち。
- 次の作業: マージ(Admin)・本番反映後に既存 HTML 資料の表示確認 → changelog の日付調整(必要時)→ G3。
- 未確定点: なし。changelog の date はマージ日に合わせて要調整(現在 2026-08-28 を仮置き)。

## 時系列ログ
- 2026-08-28: Preview でユーザーが動作確認。自己展開型バンドル HTML が新規タブで正常に表示・動作。コンソールに投稿 HTML 側スクリプトの `localStorage` 読み取りによる SecurityError が 1 件出るが表示への影響なし(サンドボックスの想定挙動)。この制約を requirements-resources.md に追記。
- 2026-08-28: ユーザー承認のうえ push・PR #87 を作成。Preview での動作確認はユーザーが実施予定。
- 2026-08-28: 実装完了。`npm test`(166件)・`npm run check` 通過。ローカル検証は `wrangler pages dev dist` 上で実施し、HTML 配信レスポンスに `Content-Disposition: inline` と `Content-Security-Policy: sandbox allow-scripts` が付与されること、新規タブ(`target="_blank"` / `rel="noopener"`)でページ表示されること、サンドボックス内で `window.origin === "null"`・`document.cookie` が SecurityError・`fetch("/api/me")` が失敗することを確認。新規タブ付与はファイル直接リンク(`/api/` 配信)に限定し、Markdown ビューアーは同一タブを維持(plan に詳細化を反映)。
- 2026-08-28: 【既存事象・本タスク対象外】`npm run dev`(nuxt dev + getPlatformProxy)環境で、(1) 資料アップロード API が R2 put 時に miniflare の devalue 復元エラー(`false == true` at ArrayBufferView)で 500、(2) ファイル配信 API が `writeHttpMetadata` の devalue 直列化エラー(`Cannot stringify arbitrary non-POJOs`)で 500 となることを確認。(1) は変更退避(git stash)状態でも再現し既存事象と確認。`wrangler pages dev dist` では両方とも正常動作。修正はユーザー指示があれば別タスクで扱う。
- 2026-08-28: G2 承認。前提条件の Access Cookie SameSite 属性は、ユーザー確認と Cloudflare API(MCP)経由の確認の双方で `lax` であることを確認(対応不要)。
- 2026-08-28: 起票。HTML 資料のダウンロード強制(コミット `aa95650` の XSS 対策)を `CSP sandbox allow-scripts` による不透明オリジン描画で解消する方式をユーザーが採用。実投稿ファイル(自己展開型バンドル HTML)が JS 必須であることを確認済み。適用範囲は資料共有のみ・新規タブで開く方針をヒアリングで確定し、G1 承認。
