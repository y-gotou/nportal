# T-008 作業ログ

## 引き継ぎサマリ
- 現状: 完了(G3 承認 2026-08-28)。PR #87 マージ・本番反映済み。
- 次の作業: なし。
- 未確定点: なし。

## 時系列ログ
- 2026-08-28: PR #87 をユーザーが GitHub UI からマージ(必須 status check の解除もユーザーが UI で実施)。本番デプロイ(`7d8919b`)成功を確認し、本番の既存 HTML 資料の配信ヘッダー(`inline` + `sandbox allow-scripts` + `nosniff`)を Access 認証付き curl で確認。changelog の date はマージ日と一致し調整不要。G3 承認、アーカイブへ移動。
- 2026-08-28: PR #87 が「Cloudflare Pages」必須 status check 待ちでマージ不可に(head が docs のみのコミットで、ビルド監視パスの除外によりビルドが起動せず status が報告されない。Cloudflare はスキップ時に status を送らない仕様)。対処としてユーザーが「必須 status check から外す」方針を決定。docs/operation.md を更新。ブランチ保護の設定変更コマンドはユーザーが実行。
- 2026-08-28: Preview でユーザーが動作確認。自己展開型バンドル HTML が新規タブで正常に表示・動作。コンソールに投稿 HTML 側スクリプトの `localStorage` 読み取りによる SecurityError が 1 件出るが表示への影響なし(サンドボックスの想定挙動)。この制約を requirements-resources.md に追記。
- 2026-08-28: ユーザー承認のうえ push・PR #87 を作成。Preview での動作確認はユーザーが実施予定。
- 2026-08-28: 実装完了。`npm test`(166件)・`npm run check` 通過。ローカル検証は `wrangler pages dev dist` 上で実施し、HTML 配信レスポンスに `Content-Disposition: inline` と `Content-Security-Policy: sandbox allow-scripts` が付与されること、新規タブ(`target="_blank"` / `rel="noopener"`)でページ表示されること、サンドボックス内で `window.origin === "null"`・`document.cookie` が SecurityError・`fetch("/api/me")` が失敗することを確認。新規タブ付与はファイル直接リンク(`/api/` 配信)に限定し、Markdown ビューアーは同一タブを維持(plan に詳細化を反映)。
- 2026-08-28: 【既存事象・本タスク対象外】`npm run dev`(nuxt dev + getPlatformProxy)環境で、(1) 資料アップロード API が R2 put 時に miniflare の devalue 復元エラー(`false == true` at ArrayBufferView)で 500、(2) ファイル配信 API が `writeHttpMetadata` の devalue 直列化エラー(`Cannot stringify arbitrary non-POJOs`)で 500 となることを確認。(1) は変更退避(git stash)状態でも再現し既存事象と確認。`wrangler pages dev dist` では両方とも正常動作。修正はユーザー指示があれば別タスクで扱う。
- 2026-08-28: G2 承認。前提条件の Access Cookie SameSite 属性は、ユーザー確認と Cloudflare API(MCP)経由の確認の双方で `lax` であることを確認(対応不要)。
- 2026-08-28: 起票。HTML 資料のダウンロード強制(コミット `aa95650` の XSS 対策)を `CSP sandbox allow-scripts` による不透明オリジン描画で解消する方式をユーザーが採用。実投稿ファイル(自己展開型バンドル HTML)が JS 必須であることを確認済み。適用範囲は資料共有のみ・新規タブで開く方針をヒアリングで確定し、G1 承認。
