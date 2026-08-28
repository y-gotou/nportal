---
id: T-010
title: zip 投稿制限の解除
scale: small
status: done
priority: mid
updated: 2026-08-28
approvals:
  spec: 2026-08-28
  done: 2026-08-28
---
# zip 投稿制限の解除

## 目的・背景

zip ファイルの投稿は 2026-05-07 に「安全性確保のため」管理者限定とした(`server/utils/upload.ts` の `validateResourceFile` に `allowZip` オプションを追加)。チャット添付も既存ルールを踏襲して同じ制限をかけている。

一方で「zip を投稿したい」という要望が多く、社内限定ポータルという前提に照らして制限が過剰と判断した。調査で確認した根拠は次のとおり。

- アップロードされた zip はサーバーで展開・解析せず R2 に保存するのみで、zip bomb や Zip Slip の攻撃面が無い。
- 危険度が同等以上の Office 形式(`doc` / `xls` / `ppt`)・`html`・`pdf` を既に全ユーザーへ開放しており、zip だけ制限する合理性が薄い。
- 配信は `X-Content-Type-Options: nosniff` 付きで、zip はブラウザ内で描画されずダウンロードとなる(HTML のような XSS 経路が生じない)。
- 全ユーザーが Cloudflare Access による認証済みで、投稿者はメールアドレスで記録される。

残存リスク(アーカイブのため混入マルウェアの発見が遅れる)は、既許可の Office 形式と同水準であり、社内限定・投稿者記録ありの条件下で受容する。

## 受入条件

- 一般ユーザー(非管理者)が資料共有の投稿・編集とチャット添付のいずれでも zip ファイルを送信でき、`validateResourceFile` が拡張子 `zip` を拒否しない。
- 資料投稿フォームで `.zip` が `accept` に含まれ、「zipは管理者のみ投稿できます。」の注意文とクライアント側の zip 検証が無くなる。
- 更新履歴(`app/utils/changelog.ts`)に本変更を追記する。

## 仕様書反映

- 変更: `docs/requirements-chat.md` の添付ファイル要件から「zip は管理者のみ」の記載を削除する。
- (`docs/requirements-resources.md` は配信要件のみを扱い zip の投稿制限に言及していないため変更不要。`docs/implementation-plan-chat.md` は過去の計画文書のため変更しない。)

## 検証方法

### エージェント実施
- [x] `npm test`(zip を権限に依らず投稿できることを検証するテストへ更新したうえで通す)
- [x] `npm run check`
- [x] `npm run dev` + モックログインで資料投稿フォームに zip を選択し、投稿が成功することを確認する

ローカルのモックユーザーは管理者設定(`.dev.vars` はユーザー管理のため変更しない)のため、非管理者アカウントでの画面確認は実施していない。実装後は権限による分岐自体が存在せず(`validateResourceFile` から `allowZip` を削除、フォームから `canSubmitZip` を削除)、その不在を単体テストで検証している。

### 実環境・ユーザー実施
- [ ] なし

## 作業ログ
### 引き継ぎサマリ
- 現状: 完了(G3 承認 2026-08-28)。PR #91 マージ・本番反映済み。
- 次の作業: なし。
- 未確定点: なし。

### 時系列
- 2026-08-28: 起票。解除範囲は資料共有(投稿・編集)とチャット添付の両方とユーザーが選択。
- 2026-08-28: G1 承認。実装に着手。
- 2026-08-28: 実装完了。`validateResourceFile` の `allowZip` オプションと zip 拒否分岐、3 箇所の呼び出し、投稿フォームの `canSubmitZip` / `isZipFile` / 権限別 `accept`・注意文を削除。`docs/requirements-chat.md` の「zip は管理者のみ」記載を削除し、許可形式の列挙に ZIP を追記。更新履歴に 1 項目追記。
- 2026-08-28: 検証。`npm test` 169 件パス、`npm run check` 成功。ローカル dev(モックログイン)で資料投稿フォームから zip を投稿し、一覧に ZIP として表示されることを確認(`accept` に `.zip` を含み、ヒント文も更新済みであることを併せて確認)。検証用に投稿した 2 件はローカルから削除済み。
- 2026-08-28: PR #91 を作成。
- 2026-08-28: PR #91 をユーザーが GitHub UI からマージ(マージコミット `0c49561`)。Cloudflare Pages の Production デプロイ `2e336ee7`(source `0c49561`)が Active であることを確認。更新履歴の date はマージ日と一致し調整不要。恒久仕様書(`docs/requirements-chat.md`)への反映は実装 PR に同梱済みで、main 上の内容と一致することを確認。G3 承認、アーカイブへ移動。
