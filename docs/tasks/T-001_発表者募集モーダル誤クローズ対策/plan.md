# T-001 実装計画

## 設計判断

- dirty 判定は純関数 `isSpeakerFormDirty(current, initial)` として `app/utils/speakers.ts`(新規)に切り出す。比較対象はタイトル・発表時間・備考の3項目。node --test で直接インポートしてテストするため(`tests/status-utils.test.ts` が `app/utils` を直接インポートする前例に倣う)。
- `app/pages/speakers.vue` はモーダルを開く際に初期値スナップショットを保持し、`isFormDirty` computed で現在値と比較する。資料ページのような子コンポーネント + `dirty-change` emit 方式は採らない(speakers はフォームがページ内インラインであり、computed 比較で足りるため)。
- `requestCloseForm()` を追加し、`app/pages/resources/index.vue:103-109` と同構造・同文言(`confirm("入力中の内容は保存されていません。閉じてもよろしいですか？")`)とする。オーバーレイの `@click.self` とキャンセルボタンの `@click` を `requestCloseForm` に差し替える。送信成功時は従来どおり `closeForm()` を直接呼ぶ。

## 影響範囲

- `app/pages/speakers.vue` — モーダル閉じ処理の変更(テンプレート2箇所 + script)
- `app/utils/speakers.ts` — 新規(dirty 判定純関数)
- `tests/speakers-form.test.ts` — 新規(ユニットテスト)
- `docs/requirements-speakers.md` — 新規(仕様書反映。発表者募集機能の概要とモーダル閉じ操作の仕様)

## 作業項目

- [ ] 1. dirty 判定純関数とユニットテストを追加する
- [ ] 2. speakers.vue の閉じ処理を requestCloseForm 方式に変更する
- [ ] 3. docs/requirements-speakers.md を新規作成する(仕様書反映)

## 検証方法

### エージェント実施
- [ ] `npm test` — 新規ユニットテストを含め通過
- [ ] `npm run check` — 型チェック・本番ビルド通過
- [ ] ローカルブラウザ確認(`npm run dev` + モックログイン、Playwright 経由) — 受入条件の3シナリオ: 未入力→外側クリックで即閉じ / 入力あり→外側クリック・キャンセルで確認表示、キャンセルで入力保持・OK で閉じる / 編集モーダルは読み込み値からの変更時のみ確認

### 実環境・ユーザー実施
- なし(認証・インフラ変更を伴わないため。_config.md の検証系統2系統で完結)
