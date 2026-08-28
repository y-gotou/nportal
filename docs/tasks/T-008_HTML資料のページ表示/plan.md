# T-008 実装計画

## 設計判断

- **配信ヘッダーの切替**: `buildResourceContentDisposition`(`server/utils/upload.ts`)にオプション `htmlInline?: boolean` を追加する。既定値は現行どおり HTML=attachment とし、資料共有の配信経路のみが明示的に inline を指定する。これにより同じユーティリティを使うチャット添付(`server/api/chat/messages/[id]/file.get.ts`)と R2 アップロード時のメタデータは無変更で済む。
- **CSP ヘッダーの付与**: `streamR2Object`(`server/utils/r2.ts`)にオプション `htmlInline?: boolean` を追加し、HTML ファイルかつ inline 指定のときのみ `Content-Security-Policy: sandbox allow-scripts` を設定する。呼び出し側の変更は `server/api/resources/[id]/file.get.ts` のみ。`isHtmlFileName` は upload.ts から export する。
- **新規タブ**: `app/pages/resources/index.vue` の「資料を開く」リンクに、ファイル資料の直接リンク(`/api/` 配信)の場合のみ `target="_blank"` と `rel="noopener"` を付与する(実装時の詳細化: Markdown はビューアーページ `/resources/{id}` への内部遷移のため同一タブを維持する)。URL 資料は既存の外部リンクプラグイン(`app/plugins/external-links.client.ts`)が新規タブ化するため対象外。既存テスト `tests/resource-submission.test.ts` の `doesNotMatch(page, /target="_blank"/)` は仕様変更として更新する。
- **既存データ**: Content-Disposition は配信時に毎回上書きされるため(r2.ts)、投稿済みファイルへの移行処理は不要。

## 影響範囲

- サーバー: `server/utils/upload.ts` / `server/utils/r2.ts` / `server/api/resources/[id]/file.get.ts`
- 画面: `app/pages/resources/index.vue`(資料共有ページのリンク挙動)
- テスト: `tests/resource-submission.test.ts`
- 恒久仕様書: `docs/requirements-resources.md` を新規作成(ファイル配信仕様の節を含む最小構成)
- 更新履歴: `app/utils/changelog.ts` に improvement として追記(一般ユーザーの体験変更に該当)

## 作業項目

- [x] 1. 配信ユーティリティの変更(htmlInline オプション・CSP ヘッダー)とユニットテスト追加
- [x] 2. 資料共有ページの新規タブ対応と既存テストの更新
- [x] 3. `docs/requirements-resources.md` の新規作成と `changelog.ts` への追記

## 検証方法

### エージェント実施
- [x] `npm test`(配信ヘッダーのユニットテスト含む)
- [x] `npm run check`
- [x] ローカルブラウザ確認: HTML ファイルを投稿し「資料を開く」から新規タブでページ表示されること(Playwright)
- [x] ローカルブラウザ確認: サンドボックス内から親オリジンの Cookie・API にアクセスできないこと

### 実環境・ユーザー実施
- [x] Cloudflare Access の `CF_Authorization` Cookie の SameSite 属性が `Lax` または `Strict` であることの確認(前提条件・Admin 実施)
- [ ] 本番反映後、既存の HTML 資料がページとして表示されることの確認
