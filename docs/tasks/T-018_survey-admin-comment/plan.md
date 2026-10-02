# T-018 実装計画

## 設計判断

- **紐付け方**: コメントは回答行(`responses.id`)に紐付ける。回答行1つが持つ自由記述は1つ(自由記述設問の回答本文、または選択式の「その他」の記述)のため、「1つの回答につき1件」と一致する。コメントできるのは終了後のみで、終了後は回答行が作り直されないため、ID は安定する。
- **スキーマ**: `db/schema.sql` に次のテーブルを追加する。`response_id` を主キーとし、1回答1件を DB の制約で保証する。
  ```sql
  CREATE TABLE IF NOT EXISTS response_comments (
    response_id INTEGER PRIMARY KEY REFERENCES responses(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now'))
  );
  ```
- **連鎖削除**: `ON DELETE CASCADE` により、回答行の削除と同時にコメントが削除される。受付再開後の再送信(`deleteUserResponses`)とアンケートの削除(`deleteSurveyResponses`)はいずれも回答行を削除するため、アプリ側に削除処理を追加しない。D1 は外部キー制約を既定で有効にしている。既存の削除順(回答 → 提出記録 → 設問 → アンケート)もこの前提に沿っている。アプリ側で個別に削除する方式は、削除経路ごとに処理が要り、漏れるとコメントが孤立するため採らない。
- **本番適用**: 新規テーブルのみのため、`npm run db:schema:prod`(`CREATE TABLE IF NOT EXISTS`)で適用できる。追加の SQL は不要。Preview D1 は `npm run db:schema:preview`。
- **本番適用の順序**: 実装 PR の merge 前に適用する。現行コードは新テーブルを参照しないため、先に適用しても影響しない。逆順では、テーブルが無い間、結果ページの取得が 500 になる。
- **取得**: `server/utils/survey-response.ts` の `getResponses` で `response_comments` を LEFT JOIN し、回答行の ID・コメント本文・更新日時を併せて返す。`types/portal.ts` の `SurveyResponse` に `id`、`comment`(無ければ `null`)、`commentUpdatedAt` を追加する。API(`/api/survey`)は結果ページと回答閲覧ページで共用し、専用の取得 API は追加しない。回答者は従来どおり返さない。
- **保存**: `PUT /api/admin/surveys/{id}/comments/{responseId}` を追加する(`server/api/admin/surveys/[id]/comments/[responseId].put.ts`)。処理は `server/utils/survey-response.ts` の新関数 `saveResponseComment` に置く。
  - `assertAdmin` で管理者のみ許可する(それ以外は 403)。
  - 回答行が指定のアンケートに属さない場合は 404。
  - アンケートの状態が `closed` 以外は 409。
  - 回答に自由記述が無い場合(選択のみの回答)は 400。判定は既存の `parseSurveySelectionAnswer` を使う。
  - 本文は前後の空白を除去する。空なら削除、それ以外は `INSERT ... ON CONFLICT(response_id) DO UPDATE` で登録・更新し、`updated_at` を更新する。
  - 上限は 1000 文字とし、超過は 400。入力欄にも `maxlength` を付ける。
- **結果の組み立て**: `shared/utils/survey.ts` の `buildSurveyResultBlocks` が返す `freeTextAnswers` / `otherTextAnswers` を、文字列の配列から `{ responseId, text, comment, commentUpdatedAt }` の配列へ変更する(`types/portal.ts` の `SurveyResultBlock`)。結果ページと回答閲覧ページの双方がこの結果を使う。
- **結果ページの表示**: `app/components/survey/SurveyResults.vue` で、コメントのある回答の枠の下部を緑色の帯にし、吹き出しアイコン・本文・日付を表示する(部品は `app/components/survey/SurveyAnswerComment.vue`)。日付は本文と同じ行の右端に置き、幅が足りない場合は本文の下へ回り込ませる。帯を枠の端まで広げるため、回答の枠は余白を内側の要素へ移す。アイコンは装飾扱いとし、読み上げ用に「運営からのコメント」を非表示テキストで添える。本文は `whitespace-pre-wrap` とテキスト補間で出力する(`v-html` は使わないため HTML は文字列になる)。日付は `updated_at`(UTC)を JST の年月日に整形する。整形関数は `app/utils/survey.ts` を新設して置く(`app/utils/speakers.ts` の `formatPostedDateTime` と同じ方式)。
- **表示方式の経緯**: 当初は回答の枠内に左罫線付きの区画で表示したが、回答本文の引用に見えるとの指摘を受け、7案(左罫線、返信カード、枠内の帯、チャット風、2列、アイコン付きテキスト、ラベル付き)を比較してユーザーが枠内の帯を選択した。配色は7種から緑、日付の位置は6種から本文の右を選択した。
- **回答閲覧ページ**: `app/pages/admin/surveys/[id]/responses.vue` を新設する。`useSurveyDetail` と `buildSurveyResultBlocks` を使い、自由記述のある設問だけを設問ごとに並べる。回答ごとに `<textarea>` と保存ボタンを置く。状態が「終了」以外のときは入力欄を無効にし、終了後にコメントできる旨を表示する(既存コメントは表示する)。保存後は画面上の値を更新し、`clearNuxtData(surveyDetailKey(id))` で結果ページ側のキャッシュを破棄する(回答送信時の既存処理と同じ)。
- **導線**: `app/pages/admin/surveys/index.vue` の各行、「編集」の左に「回答」リンクを追加する。
- **更新履歴**: 結果ページの表示が変わるため、`feature` として1項目を追記する。

## 影響範囲

- データ: `response_comments`(新規テーブル。本番・Preview への適用はユーザー実施)
- サーバ: `server/utils/survey-response.ts`、`server/api/admin/surveys/[id]/comments/[responseId].put.ts`(新規)
- 型: `types/portal.ts`(`SurveyResponse`、`SurveyResultBlock`)
- 共通: `shared/utils/survey.ts`(`buildSurveyResultBlocks`)
- 画面: `app/components/survey/SurveyResults.vue`、`app/pages/admin/surveys/[id]/responses.vue`(新規)、`app/pages/admin/surveys/index.vue`、`app/utils/survey.ts`(新規)、`app/utils/changelog.ts`
- テスト: `tests/survey-server.test.ts`、`tests/survey-utils.test.ts`、連鎖削除の確認(新規)
- 恒久仕様書: `docs/requirements-survey.md`(新規)

## 作業項目

- [x] 1. スキーマ追加とローカル D1 への適用、型・取得・保存処理と API の実装(単体テストを先に書く)
- [x] 2. 結果の組み立ての変更と、結果ページへのコメント表示
- [ ] 3. 管理画面の回答閲覧ページの新設と、一覧からの導線の追加。スクリーンショットとローカル画面でユーザーに見た目を確認してもらい、指摘を反映する
- [x] 4. 恒久仕様書の新規作成、changelog への追記、本番・Preview 用コマンドの提示

## 検証方法

### エージェント実施
- [x] `npm test`
  - 保存処理: 終了以外の状態で 409、別アンケートの回答で 404、自由記述の無い回答で 400、1000 文字超過で 400、空の本文で削除、通常の本文で登録・更新になること
  - 取得: 回答行の ID とコメントを返し、コメントが無い回答は `null` になること
  - 結果の組み立て: 自由記述と「その他」の記述にコメントが対応付くこと、選択式の集計が変わらないこと
  - 連鎖削除: `db/schema.sql` を `node:sqlite` のインメモリ DB に適用し、回答行を削除するとコメントも消えること
- [x] `npm run check`(型チェック・ビルド)
- [x] `npm run dev` + モックログインでのブラウザ確認
  - 管理画面の一覧から回答閲覧ページを開けること、回答者が表示されないこと
  - 終了したアンケートでコメントを保存・編集・削除でき、再度開くと同じ内容(改行を含む)が出ること
  - 下書き・受付中では入力できないこと、API を直接呼んでも拒否されること
  - 結果ページの回答の直下に本文と日付が出ること、記入者が出ないこと、`<script>` が文字列として出ること
  - コメントの無い回答と選択式の集計の表示に変化がないこと
  - 受付を再開して再送信すると、その回答のコメントだけが消えること(ローカル D1 で連鎖削除を確認)
  - アンケートを削除するとコメントも消えること
  - スマートフォン幅、ライト・ダーク両テーマ
- [x] 管理者以外の拒否: ローカルのモックログイン利用者は管理者で、切り替えにはユーザー管理の設定ファイルの変更が要るため、画面では確認しない。追加する API が既存の管理 API と同じく先頭で `assertAdmin` を呼ぶことをコードで確認する

### 実環境・ユーザー実施
- [ ] 見た目の確認(作業項目 3 の途中)
- [ ] Preview D1 と本番 D1 へのスキーマ適用(`npm run db:schema:preview`、`npm run db:schema:prod` を merge 前に実行)
- [ ] 本番画面でのコメントの登録・表示の確認
