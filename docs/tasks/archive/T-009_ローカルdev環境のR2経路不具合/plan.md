# T-009 実装計画

## 設計判断

### 原因(調査結果)

いずれも miniflare のバインディングプロキシ(Node ⇔ workerd 間の devalue 直列化)の制約であり、アプリ側の呼び出しを避ける以外に回避手段がないことを確認した。

1. **アップロード**: プロキシの `ArrayBufferView` reviver は復元時に `ALLOWED_ARRAY_BUFFER_VIEW_CONSTRUCTORS`(`Uint8Array` 等の標準 TypedArray のみ)に含まれるコンストラクタしか許可しない。`readMultipartFormData` が返すのは Node の `Buffer` で、`value.constructor.name === "Buffer"` が許可リストに無いため assert が `false == true` で失敗する。
2. **配信**: プロキシの `Headers` reducer は `val instanceof impl.Headers` で判定し、`impl.Headers` は miniflare が同梱する `undici` パッケージの `Headers` を指す。アプリが渡すのは Node グローバルの `Headers`(Node 内蔵 undici)で別クラスのため reducer が適用されず、devalue が `Cannot stringify arbitrary non-POJOs` を投げる。

### 依存更新は採らない

最新の miniflare(wrangler 4.127.0 が依存する 5.20260826.0-alpha)のソースを取得して確認したところ、`ALLOWED_ARRAY_BUFFER_VIEW_CONSTRUCTORS` と `NODE_PLATFORM_IMPL.Headers = require("undici").Headers` の実装は現行版(4.20260317.3)と同一で、更新しても解消しない。加えて最新 wrangler は miniflare の alpha メジャーに依存するため、開発環境の一時的な不具合の対処として採る合理性がない。よって **アプリ側で直列化に抵触する呼び出しを避ける** 方式を採用する。

### 対処方式

1. **アップロード**: `server/utils/r2.ts` に `toR2ObjectBody(data: Buffer | Uint8Array): Uint8Array` を追加し、`bucket.put` に渡す値をここで標準の `Uint8Array` へ変換する。実装は `new Uint8Array(data.buffer, data.byteOffset, data.byteLength)`(コピーを伴わないビュー。上限 50MB のファイルを二重に確保しない)。理由コメントはこのヘルパーに集約する。
   - 適用先: `server/api/resources.post.ts`(本体・添付画像)、`server/api/resources/[id].put.ts`。
   - `server/api/chat/[scheduleId]/messages.post.ts` は既に `new Uint8Array(filePart.data)` で個別回避済み(コピーを伴う形・付随コメントの理由説明が実際の原因とずれている)。同一原因の対処が二系統に分かれるのを避けるため、ヘルパー呼び出しへ統一する。
2. **配信**: `server/utils/r2.ts` の `streamR2Object` から `object.writeHttpMetadata?.(headers)` を削除し、Content-Type のフォールバックを `object.httpMetadata?.contentType` から取得する形に変える。`R2ObjectLike` から `writeHttpMetadata` の宣言も外す。
   - 挙動が変わらない根拠: 現行コードは `writeHttpMetadata` の直後に Content-Type と Content-Disposition を無条件で上書きしており、`writeHttpMetadata` の実効はプロパティ `httpMetadata.contentType` を Content-Type のフォールバックに供給することだけである。本アプリの `put` は `httpMetadata` に `contentType` と `contentDisposition` しか設定しておらず(`resources.post.ts` / `[id].put.ts` / `chat/[scheduleId]/messages.post.ts` の全経路を確認済み)、`writeHttpMetadata` が追加で書き出し得る Content-Encoding / Cache-Control / Expires / Content-Language は常に空である。

### テスト方針

R2 プロキシ不具合そのものは dev 実行環境でしか起きないため、単体テストでは miniflare が課す制約を模したスタブで再現する(`tests/resource-submission.test.ts` に追加)。

- 配信: `writeHttpMetadata` を呼ぶと throw するスタブ R2 オブジェクトを用意し、それでも配信が成功すること(= 呼ばないこと)と、`httpMetadata.contentType` が Content-Type のフォールバックとして使われることを検証する。
- アップロード: `toR2ObjectBody` に Node の `Buffer` を渡すと `constructor === Uint8Array` の値になり、中身のバイト列が一致することを検証する。呼び出し側がヘルパーを経由していることは、既存テストと同じくソース文字列の照合で確認する。

## 影響範囲

- `server/utils/r2.ts`(`toR2ObjectBody` 追加、`streamR2Object` の Content-Type フォールバック変更、`R2ObjectLike` の型定義)
- `server/api/resources.post.ts` / `server/api/resources/[id].put.ts` / `server/api/chat/[scheduleId]/messages.post.ts`(`bucket.put` の引数)
- `tests/resource-submission.test.ts`(再現テスト追加)
- 画面・データ構造・設定の変更なし。恒久仕様書への反映なし(spec.md 記載のとおり)。
- 依存パッケージの変更なし。
- 更新履歴(`app/utils/changelog.ts`): 追記しない(ローカル開発環境のみの修正で、一般ユーザーの体験は変わらない)。

## 作業項目

- [x] 1. 再現テストを追加し、現行実装で失敗することを確認する
- [x] 2. `toR2ObjectBody` を追加して `bucket.put` の呼び出し 4 箇所を置換する
- [x] 3. `streamR2Object` の `writeHttpMetadata` 依存を除去する
- [x] 4. 検証(dev / preview / test / check)を実施し、log.md に結果を記録する

## 検証方法

### エージェント実施
- [x] `npm test`(再現テストが 1 で失敗 → 2・3 で成功に転じること)
- [x] `npm run check`(typecheck + build)
- [x] `npm run dev`: 資料の投稿(pdf / md + 画像 / html)が成功し、続く配信 API が 200 かつ Content-Type / Content-Disposition / CSP が期待どおりであること。チャット添付の投稿・配信も併せて確認する
- [x] `npm run preview`(wrangler pages dev): 同経路に退行がないこと

### 実環境・ユーザー実施
- [x] 本番マージ・デプロイ後、資料の投稿と配信に退行がないことの確認(G3)
