# 会議チャット機能 実装計画書

- 作成日: 2026-06-12
- 対応する要件: [requirements-chat.md](./requirements-chat.md)
- ブランチ: `feature/meeting-chat`(main から作成、PR で main へマージ)

## 実装方針

既存コードのパターンを踏襲する。

| 項目 | 踏襲するパターン |
| --- | --- |
| サーバーロジック | `server/utils/<domain>.ts` に純粋関数+D1 アクセスを集約し、API ハンドラは薄く保つ(`survey.ts` / `resources.ts` 方式) |
| ファイルアップロード | `readMultipartFormData` + `validateResourceFile` + R2 保存(`resources.post.ts` 方式)。サイズ・形式制限は資料共有のユーティリティを共用 |
| 認証 | `event.context.user` を参照。管理者判定は `server/utils/admin.ts` |
| テスト | `node --test`。ユーティリティは `tests/*.test.ts`、D1 モックでのサーバーロジックテストは `survey-server.test.ts` 方式 |
| UI | Tailwind 4 + `app/utils/ui.ts` のボタンクラス、`PageContainer` 等の既存コンポーネント |

## フェーズ 1: 基盤(DB・型・サーバーユーティリティ)

### 1-1. DB スキーマ追加

- `db/schema.sql` に `chat_messages` / `chat_reactions` / `chat_room_state` テーブルとインデックスを追加(要件定義書 5 章の通り)
- → 検証: `npm run db:seed:local` が成功し、テーブルが作成される

### 1-2. 共有型定義

- `types/portal.ts` に追加: `ChatMessage`(kind / 引用 / 添付 / 削除フラグ含む)、`ChatReaction`、`ChatRoomResponse`(会議情報+読み取り専用フラグ)、`ChatMessagesResponse`、`CreateChatMessageInput`
- → 検証: `npm run typecheck`

### 1-3. `server/utils/chat.ts`

- 読み取り専用判定: `isChatReadOnly(scheduleDate, today)` — 会議日の翌日以降で true
- 本文バリデーション(空文字・最大長)、`kind`('text' | 'stamp')とスタンプ絵文字の検証
- DB 行 → DTO 変換(削除済みは本文を伏せて `deleted: true` で返す — 引用表示用)
- メッセージ取得(`after` 差分)・作成・論理削除・リアクショントグルの D1 クエリ関数
- ルームバージョン管理: `getRoomVersion(scheduleId)` と `bumpRoomVersion(scheduleId)`(UPSERT で +1)。**すべての変更系クエリ関数は同一バッチ内でバージョンを +1 する**
- → 検証: `tests/chat-utils.test.ts` を新規作成(読み取り専用判定の境界値、バリデーション、行変換)

## フェーズ 2: API

### 2-1. `GET /api/chat/[scheduleId]/messages?after=<id>&version=<v>`

- **最初にルームバージョン 1 行のみを読み、クライアントの `version` と一致すれば `204 No Content`(ボディ 0 バイト)を即返す**(会議室の弱いネットワーク対策。アイドル時の通信はヘッダーのみ)
- バージョンが進んでいた場合の返却: ①新バージョン ②会議情報+読み取り専用フラグ ③`after` より新しいメッセージ ④**ルーム内の全リアクション** ⑤**削除済みメッセージ ID 一覧**
- ※ ④⑤を全件返すのは、差分だけでは「過去メッセージへのリアクション追加」「削除」を検知できないため。変更があったポーリングのみで発生し、勉強会規模(1 ルーム数百件以下)では問題ない軽量さ
- 初回(`version` なし)は全件取得。存在しない `scheduleId` は 404

### 2-2. `POST /api/chat/[scheduleId]/messages`

- multipart/form-data: `kind` / `body` / `replyToId` / `file`(任意)
- 読み取り専用ルームは 403。添付は `validateResourceFile` を共用し、R2 にチャット用プレフィックス(例: `<RESOURCE_OBJECT_PREFIX>/chat/`)で保存
- zip は管理者のみ(既存ルール踏襲)

### 2-3. `DELETE /api/chat/messages/[id]`

- 本人(投稿可能期間中のみ)または管理者(期間後も可)。論理削除(`deleted_at`)+添付の R2 オブジェクトは物理削除

### 2-4. `PUT /api/chat/messages/[id]/reactions`

- body: `{ emoji }`。同一ユーザー×絵文字×投稿のトグル動作。読み取り専用ルームは 403

### 2-5. 認証ミドルウェア

- `server/middleware/auth.ts` の認証必須パスに `/chat` を追加

- → フェーズ 2 全体の検証: `tests/chat-server.test.ts` を新規作成(D1 モック)。読み取り専用 403 / 本人以外の削除 403 / 管理者削除 / リアクショントグル / 差分取得 / **バージョン一致時の 204・変更操作でのバージョン増加**を網羅

## フェーズ 3: フロントエンド

### 3-1. 依存追加

- `lucide-vue-next` をインストール(操作アイコン用)

### 3-2. チャットページ・コンポーネント

`app/pages/chat/[scheduleId].vue` +以下のコンポーネント分割:

| コンポーネント | 役割 |
| --- | --- |
| `chat/ChatRoom.vue` | ポーリング制御(3 秒間隔、`visibilitychange` でタブ非表示時は停止)、手元バージョンの保持と 204 応答時のスキップ処理、状態管理 |
| `chat/ChatMessageList.vue` | LINE 風レイアウト(自分右・他人左)、新着時の自動スクロール |
| `chat/ChatMessageItem.vue` | 吹き出し、引用ブロック、画像サムネ、ファイルリンク、リアクション表示、ホバー操作メニュー(👍😀😮😢/ピッカー/返信/削除) |
| `chat/ChatComposer.vue` | テキスト入力(Enter 送信・Shift+Enter 改行・`KeyboardEvent.isComposing` で IME 確定除外)、添付、スタンプピッカー、引用中表示 |
| `chat/ChatImageModal.vue` | 画像クリックで拡大するオーバーレイ |

実装上の注意:

- **XSS**: 本文は `v-html` を使わず、テキストを URL で分割して `<a>`(`http(s)://` のみ・`rel="noreferrer"`)とテキストノードに分けてレンダリングする
- 投稿成功時は即時に一覧へ反映(次のポーリングを待たない)

### 3-3. 入り口ボタン

- `app/pages/schedule.vue`: 「今後の会議」「過去の会議」両方の会議カードに「チャット」ボタン追加
- `app/pages/index.vue`: ヒーローカードのアクション欄に「チャットを開く」ボタン追加

- → フェーズ 3 全体の検証: `npm run typecheck` +ローカル(`npm run dev`)で手動確認
  - 投稿(テキスト/URL リンク化/画像/ファイル/スタンプ)、リアクション、引用返信、削除
  - 2 ブラウザで開きポーリング反映(3 秒以内)を確認
  - 過去日付の会議で読み取り専用表示になること
  - 開発者ツールの Network タブで、発言がない間のポーリングが 204(ボディ 0 バイト)になっていること

## フェーズ 4: 仕上げ

- `npm run check`(typecheck + build)を通す
- 全テスト実行: `npm test`
- README のディレクトリ説明にチャット関連を追記(必要最小限)

## スコープ外(計画にも含めない)

- Durable Objects / WebSocket、OGP プレビュー、未読バッジ、投稿編集、Markdown 装飾、スマホのタッチ操作最適化

## リスク・留意点

| リスク | 対応 |
| --- | --- |
| 既存 D1(本番)へのテーブル追加 | `CREATE TABLE IF NOT EXISTS` のため `npm run db:seed:prod` の再実行で安全に追加可能(既存データに影響なし) |
| ポーリングの D1 読み取り負荷 | アイドル時はバージョン 1 行の読み取りのみ。参加者 20 名 × 3 秒間隔でも D1 の無料枠内に収まる規模。問題が出たら間隔を調整 |
| バージョン更新漏れ | 変更系クエリ関数(投稿・削除・リアクション)はすべて `server/utils/chat.ts` に集約し、関数内でバージョン +1 を必ず実行する設計で防止。テストでも検証 |
| IME の Enter 誤送信 | `isComposing` 判定。Safari の挙動差異は手動確認で担保 |
| 添付削除時の R2 整合性 | D1 更新 → R2 削除の順とし、R2 削除失敗は投稿削除自体を妨げない(ログのみ) |
