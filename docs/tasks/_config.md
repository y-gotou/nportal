# タスク管理設定(プロジェクト固有)

## 恒久仕様書

- パス: `docs/requirements-<機能名>.md`(機能別に分割。例: `docs/requirements-chat.md`)
- 形式: 章立てあり(delta 反映可)
- 対象機能の文書が無い場合は、そのタスクで最小限の要件文書を新規作成して反映する

## 検証系統

- 型チェック・ビルド: `npm run check`(エージェント実施)
- 単体テスト: `npm test`(node --test。エージェント実施)
- ローカルブラウザ確認: `npm run dev` + モックログインでの画面確認(Playwright 経由でエージェント実施可)

## 固有規約

- public リポジトリのため、タスク文書にも実ホスト名・トークン等の識別子を書かない(AGENTS.md「Safety Boundaries」に従う)
- git push・PR 作成はユーザー承認後に行う(コミットまでは自動可)
