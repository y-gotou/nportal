# N Portal 運用ルール

## 基本方針

N Portal は、`y-gotou/nportal` の public リポジトリとして運用します。GitHub の Admin 権限はリポジトリ所有者のみが保持し、社内メンバーは必要時に Write collaborator として追加します。

Cloudflare Access、アプリ内 Admin 権限、Cloudflare Pages / D1 / R2 の管理権限は既存設定を維持します。これらは本運用ルールの変更対象外です。

Cloudflare Access、D1、R2 などの環境識別子は Git 管理せず、Cloudflare Pages 側の環境変数と bindings を正とします。ローカル開発時の設定例は `.env.example` を参照します。

`wrangler.jsonc` をリポジトリに配置すると Cloudflare Pages の dashboard 側 bindings を上書きする可能性があるため、実設定は Git 管理しません。設定例は `wrangler.example.jsonc` に限定します。

## GitHub 権限

- Admin: リポジトリ所有者のみ。
- Write collaborator: 開発参加が必要になった社内メンバーに都度付与する。
- GitHub collaborator の追加は GitHub ユーザー単位で行う。
- Cloudflare Zero Trust のユーザー許可と GitHub collaborator は別管理とする。

## ブランチと Pull Request

- `main` は本番反映ブランチとする。
- `main` への変更は Pull Request 経由に統一する。
- 作業ブランチ名は自由命名とする。ただし、PRタイトルと説明で変更目的が分かるようにする。
- merge は merge commit 方式を使用する。
- PR の merge は Admin のみが実施する。
- Admin 本人が作成した PR は、Cloudflare Pages Preview 成功と本人確認後に Admin が merge する。

## `main` 保護設定

GitHub の branch protection または ruleset で、次の設定を適用します。

- `main` への直接 push を禁止する。
- `main` の force push を禁止する。
- `main` の削除を禁止する。
- merge可能者を Admin に限定する。
- Cloudflare Pages Preview の成功を merge 条件にする。
- Cloudflare のチェック名は `Cloudflare Pages` を必須 status check として固定する。
- squash merge と rebase merge は、リポジトリ設定で無効化可能であれば無効化する。

## PR 確認項目

PR 作成者は、PR テンプレートに沿って次の内容を記載します。

- 変更概要。
- Cloudflare Pages Preview の結果。
- 表示確認または動作確認の内容。
- D1 スキーマ変更または本番データ操作の有無。
- Cloudflare Access、アプリ内 Admin 権限、Cloudflare Pages / D1 / R2 設定を変更していないこと。

Admin は、Cloudflare Pages Preview が成功していること、変更内容が目的と一致していること、本番データ操作が必要な場合は手順が明確であることを確認してから merge します。

## Reports 運用

アプリ内 Reports を不具合・要望の一次管理場所とします。Admin は週次で Reports を確認し、対応が必要なものだけ開発タスク化します。

対応する場合は、作業ブランチを作成して Pull Request を出し、通常の PR 運用に従います。GitHub Issues は、必要に応じた補助的な管理場所とします。

## D1 / R2 運用

- D1 スキーマ変更は SQL を PR に含める。
- D1 スキーマ変更は、ローカルまたは Preview 環境で確認してから本番適用する。
- 本番 D1 への schema / migration / data 操作は Admin のみが実行する。
- D1 操作用スクリプトは、`D1_DATABASE_NAME` または `D1_PREVIEW_DATABASE_NAME` をローカル環境変数から読み取る。
- R2 や Pages 設定の変更は、既存設定を維持する。変更が必要な場合は、PR本文に理由と影響範囲を明記し、Admin が実施する。

## 本番反映

`main` への merge を本番反映トリガーとします。Cloudflare Pages の Production デプロイ結果を確認し、失敗した場合は Admin が原因を確認します。

緊急修正でも、原則として Pull Request 経由で対応します。やむを得ず通常手順から外れる場合は、対応後に変更内容と理由を PR または運用記録に残します。

## 初期導入チェック

- [x] GitHub repository settings で merge commit を有効、squash / rebase merge を無効化する。
- [ ] リポジトリを public に変更する。
- [ ] `main` の branch protection または ruleset を設定する。
- [x] Cloudflare Pages Preview の status check 名を確認する。
- [ ] `Cloudflare Pages` を `main` の必須チェックに追加する。
- [ ] Write collaborator の追加時に、`main` へ直接 push できないことを確認する。
