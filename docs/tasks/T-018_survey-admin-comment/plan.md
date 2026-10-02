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
- **結果の組み立て**: `shared/utils/survey.ts` の `buildSurveyResultBlocks` が返す `freeTextAnswers` / `otherTextAnswers` を、文字列の配列から `{ responseId, text, comment, commentUpdatedAt }` の配列へ変更する(`types/portal.ts` の `SurveyResultBlock`)。
- **結果ページの表示**: コメントのある回答の枠の下部を緑色の帯にし、吹き出しアイコン・本文・日付を表示する(部品は `app/components/survey/SurveyAnswerComment.vue`)。日付は本文と同じ行の右端に置き、幅が足りない場合は本文の下へ回り込ませる。アイコンは装飾扱いとし、読み上げ用に「運営からのコメント」を非表示テキストで添える。本文は `whitespace-pre-wrap` とテキスト補間で出力する(`v-html` は使わないため HTML は文字列になる)。日付は `updated_at`(UTC)を JST の年月日に整形する。整形関数は `app/utils/survey.ts` に置く(`app/utils/speakers.ts` の `formatPostedDateTime` と同じ方式)。
- **回答の枠の部品化**: 自由記述の回答の枠(回答本文、「あなたの回答」の強調、コメントの帯、入力欄)を `app/components/survey/SurveyTextAnswer.vue` に切り出し、`SurveyResults.vue` の自由記述と「その他の自由記述」の2か所から使う。現状は同じマークアップが2か所に重複しており、入力の状態を持たせると重複が増えるため。
- **入力**: `SurveyTextAnswer.vue` に入力機能を持たせる。
  - 表示条件は「管理者、かつアンケートの状態が終了」。`app/pages/survey/[id]/results.vue` で `useCurrentUser()` の `isAdmin` と `survey.status` から判定し、`SurveyResults.vue` 経由で渡す。条件を満たさない場合はアイコンを描画しない。サーバ側の拒否(403・409)は保存 API が担う。
  - アイコンは回答の枠内の右上に置くボタンとし、`aria-expanded` と、状態に応じた名前(「コメントする」「コメントを編集」「コメントを保存」)を付ける。入力中は背景を付けて押下中であることを示す。
  - 押すと枠の下部(帯の位置)に `<textarea>` を開き、既存のコメントを入れてフォーカスを移す。`maxlength` は 1000。
  - もう一度押すと保存する。前後の空白を除いた内容が保存済みの内容と同じ場合は、API を呼ばずに閉じる。Esc キーは保存せずに閉じる。
  - 保存に成功したら入力欄を閉じ、部品内の表示を更新する(日付は保存時刻)。併せて `clearNuxtData(surveyDetailKey(id))` で取得済みデータを破棄する(回答送信時の既存処理と同じ)。
  - 保存中はアイコンを無効にする。失敗した場合は入力欄を開いたまま、帯の中にエラー文を表示する。
- **回答閲覧ページの廃止**: 実装済みの `app/pages/admin/surveys/[id]/responses.vue` と、`app/pages/admin/surveys/index.vue` の「回答」リンクを削除する。保存 API・スキーマ・取得処理はそのまま使う。
- **表示方式の経緯**: 当初は回答の枠内に左罫線付きの区画で表示したが、回答本文の引用に見えるとの指摘を受け、7案(左罫線、返信カード、枠内の帯、チャット風、2列、アイコン付きテキスト、ラベル付き)を比較してユーザーが枠内の帯を選択した。配色は7種から緑、日付の位置は6種から本文の右を選択した。
- **入力方式の経緯**: 当初は管理画面に回答閲覧ページを新設したが、ユーザーの指示で結果ページ上の入力へ変更した。アイコンの位置と入力欄の開き方は4案から「枠内の右上にアイコン」、保存方法は4案から「同じアイコンの再押下で保存」を選択した。
- **更新履歴**: 結果ページの表示が変わるため、`feature` として1項目を追記する。

## 影響範囲

- データ: `response_comments`(新規テーブル。本番・Preview への適用はユーザー実施)
- サーバ: `server/utils/survey-response.ts`、`server/api/admin/surveys/[id]/comments/[responseId].put.ts`(新規)
- 型: `types/portal.ts`(`SurveyResponse`、`SurveyResultBlock`)
- 共通: `shared/utils/survey.ts`(`buildSurveyResultBlocks`)
- 画面: `app/pages/survey/[id]/results.vue`、`app/components/survey/SurveyResults.vue`、`app/components/survey/SurveyTextAnswer.vue`(新規)、`app/components/survey/SurveyAnswerComment.vue`(新規)、`app/utils/survey.ts`(新規)、`app/utils/changelog.ts`
- 削除: `app/pages/admin/surveys/[id]/responses.vue`、`app/pages/admin/surveys/index.vue` の「回答」リンク(いずれも本タスクで追加したもの)
- テスト: `tests/survey-server.test.ts`、`tests/survey-utils.test.ts`、`tests/survey-comments.test.ts`(新規)、`tests/survey-results-page.test.mjs`
- 恒久仕様書: `docs/requirements-survey.md`(新規)

## 作業項目

- [x] 1. スキーマ追加とローカル D1 への適用、型・取得・保存処理と API の実装(単体テストを先に書く)
- [x] 2. 結果の組み立ての変更と、結果ページへのコメント表示
- [ ] 3. 回答閲覧ページと一覧の「回答」リンクの削除、回答の枠の部品化、結果ページへの入力機能の追加。ローカル画面でユーザーに見た目を確認してもらい、指摘を反映する
- [ ] 4. 恒久仕様書の更新、changelog の確認、本番・Preview 用コマンドの提示

## 検証方法

### エージェント実施
- [x] `npm test`(入力方式の変更後に再実行する)
  - 保存処理: 終了以外の状態で 409、別アンケートの回答で 404、自由記述の無い回答で 400、1000 文字超過で 400、空の本文で削除、通常の本文で登録・更新になること
  - 取得: 回答行の ID とコメントを返し、コメントが無い回答は `null` になること
  - 結果の組み立て: 自由記述と「その他」の記述にコメントが対応付くこと、選択式の集計が変わらないこと
  - 連鎖削除: `db/schema.sql` を `node:sqlite` のインメモリ DB に適用し、回答行を削除するとコメントも消えること
- [ ] `npm run check`(型チェック・ビルド。入力方式の変更後)
- [ ] `npm run dev` + モックログインでのブラウザ確認(入力方式の変更後)
  - 終了したアンケートの結果ページで、自由記述回答と「その他」の記述の右上にアイコンが出ること。受付中・下書きでは出ないこと
  - アイコンで入力欄が開き、もう一度押すと保存され、再読み込み後も同じ内容(改行を含む)が出ること
  - 既存コメントの編集と、空にして保存することによる削除ができること
  - 内容を変えずに押した場合と Esc キーでは、保存されずに閉じること(API が呼ばれないこと)
  - 保存に失敗した場合に、入力欄が開いたままエラーが表示されること
  - `<script>` を含むコメントが文字列として出ること、記入者が出ないこと
  - コメントの無い回答と選択式の集計の表示に変化がないこと
  - 管理画面の一覧に「回答」リンクが無く、回答閲覧ページの URL が 404 になること
  - スマートフォン幅、ライト・ダーク両テーマ、キーボードのみでの操作
- [x] 保存 API の拒否条件、受付再開後の再送信、アンケート削除時の連鎖削除(ローカルで確認済み。入力方式の変更の影響を受けない)
- [ ] 管理者以外の扱い: ローカルのモックログイン利用者は管理者で、切り替えにはユーザー管理の設定ファイルの変更が要るため、画面では確認しない。アイコンの表示条件が `isAdmin` を参照することと、保存 API が先頭で `assertAdmin` を呼ぶことをコードで確認する

### 実環境・ユーザー実施
- [ ] 見た目の確認(作業項目 3 の途中)
- [ ] Preview D1 と本番 D1 へのスキーマ適用(`npm run db:schema:preview`、`npm run db:schema:prod` を merge 前に実行)
- [ ] 本番画面でのコメントの登録・表示の確認
