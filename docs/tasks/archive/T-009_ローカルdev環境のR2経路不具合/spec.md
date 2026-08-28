---
id: T-009
title: ローカルdev環境のR2経路不具合
scale: medium
status: done
priority: mid
updated: 2026-08-28
approvals:
  spec: 2026-08-28
  plan: 2026-08-28
  done: 2026-08-28
---
# ローカルdev環境のR2経路不具合

## 目的・背景

T-008 の作業中(2026-08-28)に、`npm run dev`(nuxt dev + nitro-cloudflare-dev の getPlatformProxy)環境で R2 binding を通る API が 500 になる既存事象を確認した(T-008 の log.md 参照)。

1. **アップロード**: `POST /api/resources`(R2 `bucket.put`)が miniflare の devalue 復元エラー `false == true` at ArrayBufferView で失敗する。
2. **配信**: `GET /api/resources/{id}/file` の `object.writeHttpMetadata(headers)` が devalue 直列化エラー `Cannot stringify arbitrary non-POJOs`(Headers を直列化できない)で失敗する。

いずれも miniflare のバインディングプロキシ(Node プロセス ⇔ workerd 間の値直列化)に起因し、workerd で直接実行する `npm run preview`(wrangler pages dev)では発生しない。T-008 の変更を退避した状態でも再現することを確認済み(本番・preview には影響なし)。このため現状、R2 を通す動作確認は preview 経由が必要で、日常検証をローカル dev で完結させる方針(PR #58)が資料共有機能について崩れている。

## 確定要件

- `npm run dev` 環境で、資料共有のファイルアップロード(`POST /api/resources`)とファイル配信(`GET /api/resources/{id}/file`、画像・チャット添付含む R2 配信経路)が 500 にならず動作するようにする。
- 対処方法(依存パッケージの更新か、アプリ側でプロキシ直列化に抵触する呼び出しの回避か)は調査のうえ実装計画(G2)で確定する。アプリ側を変更する場合も、本番・preview の挙動(配信ヘッダー含む)を変えないこと。

### 対象外

- 本番・preview 環境の挙動変更(現状問題なし)。
- ローカル D1・モックログイン等、R2 以外のローカル開発経路(現状問題なし)。

## 受入条件

- `npm run dev` 起動中に、資料(HTML 含む)のアップロード API が成功し、続けて配信 API が正しいヘッダー(Content-Type / Content-Disposition / CSP)で 200 を返す。
- `npm run preview` での同経路の挙動、および `npm test` / `npm run check` に退行がない。
- 配信ヘッダーのユニットテスト(T-008 で追加分)が引き続き通る。

## 仕様書反映

なし(ローカル開発環境のみの修正。ユーザー向け仕様への影響はない)。修正内容が開発手順に影響する場合は README のセットアップ節の記載を確認する。
