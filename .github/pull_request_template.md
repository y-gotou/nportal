## 概要

-

## 確認

- [ ] `npm test` と `npm run check` が成功している。
- [ ] Preview で関連する画面または操作フローを確認している。
- [ ] 更新履歴(`app/utils/changelog.ts`)に追記した。または掲載基準外のため追記不要と判断した。

## 運用影響

該当する項目にチェックし、必要な手順を記載する。いずれも該当しなければ空のままとする。

- [ ] D1 スキーマを変更した。（merge 後に Admin が `npm run db:schema:prod` を実行する）
- [ ] 本番 D1 のデータ操作が必要である。 → 手順:
- [ ] Cloudflare Pages の環境変数を追加・変更した。（Production の再デプロイが必要）
- [ ] Cloudflare Access / アプリ内 Admin 権限 / Cloudflare Pages・D1・R2 の設定を変更した。 → 理由と影響範囲:

## 補足

-
