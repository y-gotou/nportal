# T-011 作業ログ

## 引き継ぎサマリ
<!-- 常に最新状態へ上書きする。別セッションのエージェントがこの節だけで再開できること -->
- 現状: 実装完了。PR #93 作成済み(ブランチ `feat/speaker-resource-link`)。エージェント実施の検証(`npm test` 187 件 / `npm run check` / ローカルブラウザ確認)はすべて消化済み。Admin のマージ待ち。
- 次の作業: マージ後に本番 D1 へ `ALTER TABLE speaker_applications ADD COLUMN resource_id INTEGER;` と `CREATE UNIQUE INDEX IF NOT EXISTS idx_speaker_applications_resource ON speaker_applications(resource_id);` をユーザーが適用(本番反映前に実施)。その後に本番画面を確認して G3 へ。
- 未確定点: changelog の日付を 2026-08-31 で起案済み。マージ日が変わる場合は差し替えが必要。

## 時系列ログ
<!-- 追記専用。日付+要点。検証結果の詳細もここに記載する(spec/plan には書かない) -->
- 2026-08-31: 起票。ヒアリングで以下を確定。紐付けは 1 対 1 / 既存資料からの選択 / 本人(自分の投稿分)＋管理者(全件) / ステータス制約なし / カードは「資料を見る」固定文言 / 資料側はリンクなしのテキスト表示 / `presenter`・`related_minutes_slug` は未設定時のみ自動反映し応募側の変更に追従 / 資料削除時は自動解除。規模は中規模と判定(恒久仕様書 2 文書にまたがるが設計判断は単一・1 PR 想定)。G1 承認。
- 2026-08-31: 計画立案中に、既存仕様(`status = 'done'` の応募は本人が編集不可)と「ステータス制約なし」の衝突が判明。ユーザー確認のうえ、紐付けは編集モーダルではなく応募カード上のセレクトで行い、専用 API で done でも操作可とする方針に決定。spec.md の操作場所と受入条件を修正。あわせて、資料の `presenter` は投稿時に常に自動設定されるため自動反映が実質空転する旨を確認し、共通化のコストが軽微なためそのまま実装する方針とした。
- 2026-08-31: plan.md 作成。G2 承認。
- 2026-08-31: 作業項目 1・2 を実装。`speaker_applications.resource_id` と UNIQUE インデックスを追加し、ローカル D1 へ適用済み(列の存在を pragma で確認)。本人用 `PUT /api/speakers/[id]/resource` を新設、管理者用 PUT に `resource_id` を追加、`ResourceItem.linkedApplication` を LEFT JOIN で取得、資料削除時の自動解除を実装。`tests/speaker-resource-link.test.ts` を新規追加(16 ケース)。
- 2026-08-31: 作業項目 3 を実装。発表者募集ページの応募カードに資料セレクトと「資料を見る」リンク、管理画面に資料列、資料一覧に「発表: …」テキストを追加。`opensInNewTab` を `app/utils/resources.ts` の `resourceOpensInNewTab` へ移設し 2 ページで共用(既存テストの参照名も更新)。候補絞り込みは `selectableResourcesForApplication` に切り出してテスト追加。
- 2026-08-31: ローカルブラウザ確認を実施。本人 API での紐付けで資料の `related_minutes_slug` に応募の議事録が反映されること、重複紐付け 409・他人の応募 403・存在しない資料 404、発表済み応募でもセレクトが表示され付け替え可能(編集ボタンは非表示のまま)、管理画面のセレクトが他の応募に紐付いた資料を候補から除外すること、資料一覧の「発表: テスト」表示、資料削除で `resource_id` が NULL に戻り「資料を見る」が消えることを確認。検証用に作成したローカルデータは削除して原状復帰。
- 2026-08-31: 作業項目 4 を実施。`docs/requirements-speakers.md` §2 更新・§5 新設、`docs/requirements-resources.md` に紐付け節を追加、`app/utils/changelog.ts` へ feature 1 件を起案。`npm test` 187 件成功、`npm run check` 成功。
- 2026-08-31: push・PR 作成の承認を得て PR #93 を作成。status を blocked(マージと本番 D1 適用のユーザー実施待ち)へ変更。
