# T-006 実装計画

## 設計判断

- `app/utils/external-links.ts` に、リンク URL と現在のオリジンから外部 HTTP(S) URL かを判定する副作用のない関数を追加する。`URL` 標準 API を使用し、scheme・host・port を含む `origin` の不一致で外部を判定する。
- `app/plugins/external-links.client.ts` にクライアントプラグインを追加し、ハイドレーション後の `<a href>` を共通判定する。外部リンクに `target="_blank"` と `rel` の `noopener noreferrer` を付与する。
- ページ遷移、非同期データ、`v-html` で生成される Markdown 内リンク、今後のリンク追加を一律に扱うため、`MutationObserver` で追加ノードと `href` 変更を再評価する。共通処理が付与した属性はリンクが対象外に変わった際に戻し、明示的に設定されていた属性は保存する。
- 既存のコンポーネント固有の表示構造は変更せず、リンク属性の共通制御のみ追加する。これにより、通常テンプレートと Markdown 生成 HTML の両方を1つの規則で扱う。

## 影響範囲

- 外部 URL 判定: `app/utils/external-links.ts`
- リンク属性の共通適用: `app/plugins/external-links.client.ts`
- 自動テスト: `tests/external-links.test.ts`
- 既存リンクの回帰確認: ホーム、スケジュール、資料一覧・詳細、議事録詳細、ニュース、チャット、サイトナビゲーション
- 恒久仕様書: `docs/requirements-links.md`

## 作業項目

- [x] 1. 外部 URL 判定と共通適用の失敗テストを追加する。
- [x] 2. 外部リンク属性を共通適用するクライアント処理を実装し、テストを通過させる。
- [x] 3. 外部リンクの恒久仕様書を追加し、リポジトリ全体の検証を実施する。

## 検証方法

### エージェント実施

- [x] `npm test`: 外部 HTTP(S)、同一オリジン、別サブドメイン、別ポート、相対 URL、非 HTTP(S)、不正 URL の判定を確認する。
- [x] `npm test`: 共通処理が外部リンクに必要属性を付与し、対象外へ変更された場合に元の属性を保存することを確認する。
- [x] `npm run check`: 型チェックとプロダクションビルドを確認する。
- [x] `npm run dev` と Playwright: 実際の DOM で外部リンクに必要属性が付き、同一オリジンのリンクに共通処理が新規タブ表示を付与しないことを確認する。

### 実環境・ユーザー実施

- [x] なし。
