# ソース整理 タスク管理

要件(2026-08-19 確定):

- 対象はリポジトリ全体(`scripts/` 配下の routine スクリプトは対象外)
- 作業内容は「重複コードの共通化」「不要コードの削除」「ファイル配置の再編」「肥大化ファイルの分割」
- 挙動変更は同意済みの3件のみ(C1 バグ修正・B2 401メッセージ統一・C3 survey 配色統一)
- 1ステップ = 1ブランチ = 1PR。完了条件は `npm run check` 通過(UI 変更を伴うステップは実機確認を追加)
- 各ステップの PR は統合ブランチ `refactor/source-cleanup` 向けに作成し、全ステップ完了後に統合ブランチ → main の PR を 1 本作成する(本番デプロイを 1 回に抑えるため。2026-08-19 決定)。作業期間中に main へ入った変更は随時統合ブランチへ取り込む

各 ID の詳細は 2026-08-19 の調査報告書(会話ログ)を参照。

## ステータス凡例

未着手 / 作業中 / レビュー待ち(PR 承認待ち) / 完了 / 見送り

## タスク一覧

| 順 | ID | 内容 | 状態 | ブランチ | PR | 検証 |
|---|----|------|------|---------|----|------|
| ① | B1 | `getDb` を `server/utils/db.ts` へ移設 | 完了 | refactor/source-cleanup-01-db-util | #61 | check 通過(typecheck / build / tests 112 件全パス) |
| ② | D2 | `resources.ts` 分割(r2 / upload / markdown) | 完了 | refactor/source-cleanup-02-resources-split | #62 | check 通過(typecheck / build / tests 112 件全パス) |
| ③ | D1+D5 | `utils/` → `shared/utils/` 移設、README・`.ts` 拡張子修正 | 完了 | refactor/source-cleanup-03-shared-utils | #63 | check 通過(typecheck / build / tests 112 件全パス) |
| ④ | A1+A2 | 不要コード削除(`getMinutesDetailById`、admin/resources API 2本) | 完了 | refactor/source-cleanup-04-dead-code | #64 | check 通過(typecheck / build / tests 112 件全パス) |
| ⑤ | B2〜B7+A3 | サーバー側共通化(requireUser / multipart / R2 ストリーム / ID パーサ / 設問 INSERT / 共有ユーティリティ)+ export 修飾整理 | 完了 | refactor/source-cleanup-05-server-dedup | #65 | check 通過(typecheck / build / tests 120 件全パス) |
| ⑥ | E1 | `survey.ts` から `survey-response.ts` を分離 | 完了 | refactor/source-cleanup-06-survey-response | #66 | check 通過(typecheck / build / tests 120 件全パス) |
| ⑦ | C1 | admin/surveys new/edit 共通化 + new.vue の validate バグ修正 | 完了 | refactor/source-cleanup-07-survey-editor | #67 | check 通過(tests 126 件全パス)+ 実機確認済み |
| ⑧ | C2+C3 | admin フォーム定型・ステータス表示の共通化(survey 配色統一含む) | 完了 | refactor/source-cleanup-08-admin-form | #68 | check 通過(tests 126 件全パス)+ 実機確認済み |
| ⑨ | E2+E3+D3 | SurveyForm / SiteHeader 分割、components ドメイン別再編 | 完了 | refactor/source-cleanup-09-components | #69 | check 通過(tests 136 件全パス)+ 実機確認済み |
| ⑩ | — | 統合ブランチ → main の最終 PR(本番反映) | 完了 | refactor/source-cleanup | #70 | check 通過(typecheck / build / tests 136 件全パス)。2026-08-20 マージ・本番デプロイ |
| — | C4 | 検索クエリ同期の共通化 | 見送り | — | — | — |

## 作業メモ

- C4 は URL 履歴・スクロール挙動への影響リスクがあるため見送り(2026-08-19 決定)
- ②のブランチは①(getDb 移設)の変更に依存するため①から分岐。②の PR は #61 マージ後に作成する
- ②の分割結果: resources.ts 653行 → resources.ts 411行 + upload.ts 154行 + r2.ts 59行 + resource-markdown.ts 35行。シンボル名は変更せず移動のみ
- ⑦の実機確認(2026-08-19、ローカル dev): 新規作成でエラー表示→部分修正→再送信で該当エラーのみ解消(バグ修正確認)。作成・編集・保存・回答後の設問ロック(注意文表示・入力/追加ボタン disabled)・ロック中の基本情報更新・削除まで一連動作を確認。コンソールエラーなし。テストデータは削除済み
- ⑨の判断事項: SiteHeader の開閉状態・Escape/クリック外/スクロールロック制御は挙動リスク回避のため分割せず SiteHeader に残置(useClickOutside への置換・useHeaderMenus 化は見送り)。汎用 UI コンポーネント(PageContainer 等)と AdminFormField の移動は自動 import 名が変わり呼び出し側の一括変更が必要になるため見送り。テストから #shared を解決するため package.json に imports を追加
- ⑨の実機確認(2026-08-19、ローカル dev): アンケート回答(未回答/その他未入力の検証とフォーカス移動、単一+その他・複数・自由記述の送信、回答の保存とシリアライズ、結果集計表示)、ヘッダー(デスクトップのナビ8件・ユーザーメニュー5項目・テーマ切替往復・Escape 閉じ、モバイルのドロワー開閉・スクロールロック・ナビ遷移で自動クローズ)を確認。コンソールエラーなし。テストデータは削除済み
- ⑧の判断事項: survey 配色の統一方向は「公開側の受付中=青」を正とし、admin の active バッジを緑→青に変更。下書きの amber 強調は admin 一覧のみ(highlightDraft オプション)とし、管理者が公開一覧で下書きを見た場合も従来どおりグレーを維持(レビュー指摘で修正)。ResourceSubmissionForm への useAdminForm 適用は公開ページ共用のため⑧では見送り
- ⑧の実機確認(2026-08-19、ローカル dev): minutes/schedule の新規(検証エラー→作成)・編集(スラッグ表示・開催日 disabled・保存)・削除、admin/公開の survey バッジ(受付中=青に統一・下書き表示)、speaker 応募→バッジ(応募中=amber)→admin でステータス変更→公開側バッジ(発表予定=青)→削除、reports のラベル表示を確認。コンソールエラーなし。テストデータは削除済み
- ⑤の判断事項: chat 添付が R2 メタデータを Content-Type に使わない従来挙動は streamR2Object の useObjectMetadata オプションで維持。401 メッセージは「Unauthorized」に統一(同意済みの挙動変更)。export された型の un-export は公開 API 面として見送り。shared 配下の .ts 拡張子 import のため nuxt.config に sharedTsConfig を追加
