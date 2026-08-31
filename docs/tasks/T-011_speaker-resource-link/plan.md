# T-011 実装計画

## 設計判断

- **スキーマ**: `db/schema.sql` の `speaker_applications` に `resource_id INTEGER`(NULL 許容)を追加し、`CREATE UNIQUE INDEX idx_speaker_applications_resource ON speaker_applications(resource_id);` を張る。SQLite の UNIQUE インデックスは NULL を重複扱いしないため、未紐付けが複数あっても成立し、1 対 1 制約をデータ層で保証できる。適用は次の 2 文(ローカル D1 はエージェント、本番 D1 はユーザーが適用)。
  - `ALTER TABLE speaker_applications ADD COLUMN resource_id INTEGER;`
  - `CREATE UNIQUE INDEX IF NOT EXISTS idx_speaker_applications_resource ON speaker_applications(resource_id);`
  - 外部キー制約は付けない(既存スキーマの参照制約を使わない方針に合わせる)。参照整合は資料削除時の解除処理で担保する。
- **紐付けの保持方向**: 応募側に `resource_id` を持たせる。資料側に列を足す案は採らない。資料は応募より寿命が長く、削除・再投稿の主体が資料側であるため、参照を持つ側を応募に寄せたほうが「資料削除時に解除」の実装が単純になる。
- **紐付け専用 API(本人用)**: `PUT /api/speakers/[id]/resource`(ボディ `{ resource_id: number | null }`)を新設する。既存の `PUT /api/speakers/[id]` は `status = 'done'` を 409 で弾くため、そこには相乗りしない。新エンドポイントは所有者チェックのみ行い、ステータスは問わない。
- **紐付け検証の共通化**: `server/utils/speakers.ts` に `setSpeakerApplicationResource(db, id, resourceId, opts)` を追加し、本人用・管理者用の双方から呼ぶ。検証内容は次のとおり。
  - 資料が存在すること(404)。
  - `opts.requireSubmittedBy` 指定時は `resources.submitted_by` が当該メールと一致すること(403)。管理者経由では指定しない。
  - 同じ資料が他の応募に紐付いていないこと(409)。UNIQUE 制約違反も同じ 409 に正規化する。
- **管理者用 API**: 既存の `PUT /api/admin/speakers/[id]` のボディに `resource_id`(number | null)を追加し、`AdminSpeakerUpdates` を拡張する。`minutes_slug` と同じ部分更新の作法に合わせる。
- **資料側項目の自動反映**: `server/utils/speakers.ts` に `syncLinkedResourceFields(db, application)` を置き、紐付いた資料の `presenter` / `related_minutes_slug` が NULL または空文字のときのみ、応募者メール / 応募の `minutes_slug` を書き込む。呼び出し箇所は「紐付け設定時」と「管理者による応募更新時(`adminUpdateSpeakerApplication`)」の 2 か所とし、これで応募側の変更への追従を満たす。
  - 補足: 資料の `presenter` は `createSubmittedResource` / `updateSubmittedResource` が常に `submitted_by` を書き込むため、通常経路の資料では空転する。seed データ等で NULL の資料に備えて実装は残す(G2 前にユーザー確認済み)。
- **資料側の逆引き**: `types/portal.ts` の `ResourceItem` に `linkedApplication: { id: number; title: string } | null` を追加し、`listResources` / `getResourceItem` の SQL を `LEFT JOIN speaker_applications` に変更して同時に取得する。これにより資料一覧のテキスト表示と、紐付け候補からの除外判定(`linkedApplication` が自分の応募以外なら候補外)の双方を 1 回の取得で賄える。
- **資料削除時の解除**: `deleteResourceItem` 内で `UPDATE speaker_applications SET resource_id = NULL, updated_at = ? WHERE resource_id = ?` を資料行の DELETE 前に実行する。既存の resource_images 削除と同じ並びに置く。
- **公開画面**: `app/pages/speakers.vue` で `/api/resources` を取得し、
  - 紐付けがある応募カードに、既存の「議事録を見る」と並べて「資料を見る」リンク(遷移先は `ResourceItem.url`。ファイル資料は既存規約どおり新規タブ・`rel="noopener"`、Markdown/URL は既存の動作に従う)を表示する。
  - 自分の応募カードにのみ資料セレクト(先頭「紐付けなし」+ 候補)を表示し、変更時に `PUT /api/speakers/[id]/resource` を呼んで `refresh()` する。管理画面のステータスセレクトと同じく、SSR での選択状態は `option` の `selected` で指定する(T-005 の既知事項)。
- **管理画面**: `app/pages/admin/speakers.vue` の議事録セレクトの右に資料セレクトを追加し、既存の PUT に `resource_id` を載せる。
- **資料一覧**: `app/pages/resources/index.vue` のカードに、`linkedApplication` があるとき「発表: {title}」をテキスト表示する(リンクにしない)。
- **候補の絞り込み**: 候補判定は `app/utils/speakers.ts` に純粋関数 `selectableResourcesForApplication(resources, applicationId, userEmail)` として切り出し、単体テストの対象にする。

## 影響範囲

- データ: `speaker_applications`(列追加・UNIQUE インデックス追加。本番適用はユーザー実施)
- サーバ: `server/utils/speakers.ts`、`server/utils/resources.ts`、`server/api/speakers/[id]/resource.put.ts`(新規)、`server/api/admin/speakers/[id].put.ts`
- 型: `types/portal.ts`(`SpeakerApplication`・`ResourceItem`)
- 画面: `app/pages/speakers.vue`、`app/pages/admin/speakers.vue`、`app/pages/resources/index.vue`
- 共通: `app/utils/speakers.ts`(候補絞り込み)、`app/utils/changelog.ts`(更新履歴)
- 恒久仕様書: `docs/requirements-speakers.md`(§2 変更・紐付け節の新設)、`docs/requirements-resources.md`(紐付け節の新設)

## 作業項目

- [ ] 1. スキーマ更新とローカル D1 への適用、`setSpeakerApplicationResource` / `syncLinkedResourceFields` と本人用・管理者用 API の実装(単体テスト追加)
- [ ] 2. `ResourceItem.linkedApplication` の追加(LEFT JOIN)と、資料削除時の紐付け自動解除(単体テスト追加)
- [ ] 3. 発表者募集ページのセレクトと「資料を見る」リンク、管理画面のセレクト、資料一覧のテキスト表示(候補絞り込み関数の単体テスト追加)
- [ ] 4. 恒久仕様書 2 文書への反映、changelog 追記の起案、本番用マイグレーションコマンドの提示

## 検証方法

### エージェント実施
- [ ] `npm run check`(型チェック・ビルド)
- [ ] `npm test`(紐付け設定・解除、他人の資料指定の 403、重複紐付けの 409、done の応募でも本人が紐付け可、資料削除時の自動解除、`presenter`/`related_minutes_slug` の未設定時のみ反映と応募更新への追従、候補絞り込み関数)
- [ ] `npm run dev` + モックログインでのブラウザ確認(自分の応募カードでの選択→「資料を見る」表示と遷移、他人のカードにセレクトが出ないこと、発表済み応募での操作、資料一覧の「発表: …」表示、管理画面からの設定・解除、資料削除でリンクが消えること)

### 実環境・ユーザー実施
- [ ] 本番 D1 へのマイグレーション適用(提示コマンドをユーザーが実行)
- [ ] 本番画面での紐付け設定・表示の確認
