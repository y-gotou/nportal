# AI ニュース掲示機能 要件定義書

- 作成日: 2026-07-31
- ステータス: ドラフト(ヒアリング完了・実装着手前)

## 1. 背景・目的

社内 AI 勉強会の参加者が、AI 関連の動向を日常的にキャッチアップできる場を N Portal 上に設ける。ニュースの収集・選定・要約・ランキングは Claude のクラウドタスクが自動で行い、閲覧者は 👍 / 👎 で評価する。評価は次回以降の選定基準に自動で反映され、参加者の関心に沿ったランキングへ継続的に近づける。

木曜 16:00 からの社内 AI 会議に向けて、木曜朝に週次ダイジェストを自動生成し、会議の導入資料としてそのまま使えるようにする。

## 2. スコープ

### 対象

- 日次のニュース掲示(毎朝・5〜8 件)
- 木曜朝の週次ダイジェスト(過去 7 日の上位再掲 + 今週の流れの要約)
- 👍 / 👎 による評価と、評価に基づくランキングの自動調整
- 評価傾向を次回選定へ反映するフィードバック学習
- Claude クラウドタスクからの取り込み API と、評価集計の取得 API

### 対象外

- 記事本文の全文転載・保存(出典リンクと自前生成の要約のみを保持する)
- 個人別パーソナライズ(全社共通ランキングのみ)
- コメント投稿、記事のユーザー投稿
- 通知(メール・Teams 連携)
- ニュース記事の詳細ページ(一覧カード上で要旨が完結する設計とする)

## 3. 全体構成

```text
[Claude クラウドタスク]  (日次 / 週次)
   1. GET  /api/news/feedback-summary   ← 評価傾向・掲載済みURLを取得
   2. RSS 取得 + Tavily Web 検索         ← 候補記事の収集
   3. LLM で選定・要約・スコアリング
   4. POST /api/news/ingest             → 掲載データを投入
                    │
                    ▼
            [nportal / D1]
                    │
                    ▼
        [/news ページ]  ← 閲覧・👍👎
```

- 定期実行は Claude のクラウドタスクで行う。Cloudflare Pages Functions は Cron Triggers に対応しないため、アプリ内でのスケジュール実行は行わない。
- 記事データは D1 に保持する。リポジトリへのコミットは行わないため、掲載のたびに Pages の再デプロイは発生しない。

### 3.1 実行基盤(Routines)の制約

定期実行には Claude Code の **Routines**(`claude.ai/code/routines`)を用いる。公式ドキュメントで確認した制約は以下のとおり。

| 項目 | 内容 |
| --- | --- |
| スケジュール | hourly / daily / weekdays / weekly のプリセット。カスタム cron は CLI の `/schedule update` で設定。最小間隔は 1 時間 |
| タイムゾーン | 入力したローカル時刻がそのまま実行される(UTC 換算は不要)。数分のずれ(stagger)が発生する |
| ネットワーク | 既定の **Trusted** は許可リスト内(パッケージレジストリ・GitHub 等)のみ。**許可外は 403 + `x-deny-reason: host_not_allowed`** |
| 秘密情報 | 専用のシークレットストアはなく、環境変数はその環境の利用者全員が閲覧できる |
| 実行単位 | routine は個人の claude.ai アカウントに紐づく。1 日あたりの実行回数に上限がある |
| 実行環境 | 毎回リポジトリを clone した使い捨て VM(Ubuntu 24.04、Node.js 同梱)。プロンプトは自己完結している必要がある |

このため、ニュース収集用に **Custom** ネットワークアクセスの専用クラウド環境を作成し、収集元・Tavily・nportal のドメインを許可リストに登録する。

### 3.2 前提検証(フェーズ 0)— 完了

`scripts/verify-news-sources.mjs` をクラウド環境で実行し、**16 項目すべて到達を確認済み**(2026-07-31)。

| 対象 | 結果 |
| --- | --- |
| 収集元 RSS 14 件 | すべて HTTP 200、記事取得可 |
| Tavily API | HTTP 200、検索結果を取得 |
| nportal `/api/me` | HTTP 401(Access を通過しアプリまで到達。email クレームがないための 401 で想定どおり) |

設定の要点は以下のとおり。

- ニュース専用のクラウド環境を **Custom** ネットワークアクセスで作成し、収集元・`api.tavily.com`・nportal のドメインを許可リストに登録した
- nportal の Access アプリに Service Auth ポリシーを追加し、ニュース用サービストークンを許可した(既存の allow ポリシーは変更していない)
- セットアップスクリプトは不要。VM に Node.js が同梱されており、検証スクリプトは組み込み `fetch` のみを使う
- 収集スクリプトも依存パッケージなしで実装する。`package.json` には Nuxt 一式が含まれるため、routine で `npm install` を実行すると不要な依存解決が毎回発生する

### 3.3 記事本文の取得方針

Custom 許可リストでは、Tavily の検索結果に出てきた任意の記事ドメインへは到達できない。記事本文を得る手段は以下に限定する。

- RSS の `description` / `content` 要素
- Tavily 検索(`/search`)のレスポンスに含まれる本文抜粋
- Tavily 抽出(`/extract`)で取得した本文。Tavily 側が対象ページを取得するため、`api.tavily.com` のみで完結する

RSS が本文を含まない収集元(Hacker News など)は、抽出 API を使わなければ要約を書けず毎回除外される。ただし抽出はクレジットを消費するため、**選定後の記事に限って**呼ぶ(`scripts/news-extract.mjs`)。

許可リストを **Full**(全ドメイン許可)にすれば任意の記事本文を取得できるが、サンドボックスの外部通信が無制限になるため採用しない。

## 4. データ収集

### 4.1 収集ソース

固定 RSS を主軸とし、Tavily Web 検索で取りこぼしを補完するハイブリッド構成とする。フィード一覧は `scripts/news-feeds.mjs` に定義し、到達性検証(`verify-news-sources.mjs`)と収集(`news-collect.mjs`)で同じ定義を使う。

| 区分 | フィード(到達確認済み) |
| --- | --- |
| 国内 IT メディア | ITmedia AI+、ITmedia NEWS、Publickey、gihyo.jp、PC Watch、MIT Tech Review Japan |
| ベンダー公式ブログ | OpenAI、Google(The Keyword)、Google DeepMind、AWS ML Blog、GitHub Blog(AI/ML)、Azure Blog |
| 技術コミュニティ | はてなブックマーク(AI 検索)、Zenn(ai)、Qiita(ai)、Hacker News(AI/LLM) |

- Anthropic と Meta AI は公開 RSS が存在しないことを確認したため、Tavily 検索で補完する
- ZDNet Japan は AI 単独のフィードが見つからず、記事数も他媒体と重複するため除外した
- 海外メディア・論文(TechCrunch、arXiv 等)は今回のスコープに含めない

### 4.2 収集ウィンドウ

- 日次: 前回実行時刻以降に公開された記事
- 週次: 過去 7 日に掲載した記事(再収集は行わない)

### 4.3 重複排除

- URL を正規化して比較する。フラグメントと計測用パラメータ(`utm_*` / `fbclid` / `gclid` / `mc_cid` / `mc_eid` / `ref` / `ref_src`)を除去し、ホスト名を小文字化、末尾スラッシュを統一する
  - クエリ全体を除去すると `?p=123` のように記事 ID をクエリで表す URL を壊すため、除去は計測用パラメータに限定する
- 過去 14 日以内に掲載済みの URL は候補から除外する(`feedback-summary` が掲載済み URL を返す)
- 同一トピックの別ソース記事は、LLM が選定段階で 1 件に集約する

### 4.4 著作権上の取り扱い

- 記事本文は保存せず、要約は LLM が自前の言葉で生成する
- 見出しは原題を用いてよいが、必要に応じて平易な日本語に言い換える
- カードには必ず出典名と元記事へのリンクを表示する

## 5. 重要度の判断基準

### 5.1 影響の観点(impact_axis)

記事ごとの説明文(`why_important`)は自由記述にせず、以下 5 分類から必ず 1 つを選択させ、その定義に沿って記述させる。同じ分類を `ai_score` のルーブリックとしても用い、点数と説明文が食い違わないようにする。

判断の主体は勉強会の参加者(読み手)であり、「参加者自身の業務・開発・学習にとって何を意味するか」を基準とする。特定の共有基盤や全社的な導入状況を前提にしてはならない。

| 観点 | 判断基準 | ai_score 目安 |
| --- | --- | --- |
| `tooling` ツール・コスト | 業務や開発で使う(使いうる)LLM・SaaS・API の価格、性能、提供条件が変わる | 70–90 |
| `risk` リスク・ガバナンス | 規制、ライセンス、情報漏洩、セキュリティなど、AI を業務で使う際の注意点に関わる | 70–95 |
| `practice` 開発・業務手法 | 実装パターンやプロンプト設計など、明日から真似できる知見がある | 60–85 |
| `learning` 学習テーマ | 勉強会の題材になる、手を動かして試せる | 50–75 |
| `landscape` 業界動向 | 直接の行動は伴わないが、中期的な前提が変わる | 40–65 |

選択した観点は `news_articles.impact_axis` に保存し、タグ・出典と同様に評価集計の軸として用いる(§7.2)。

### 5.2 説明文(`why_important`)の記述ルール

- 主語を読み手(勉強会の参加者)に置く。業界一般の解説は書かない
- 特定の社内システムの導入・利用を既定事実として書かない(勉強会は個人の環境で検証している段階のため)
- 記事に書かれた事実のみを根拠にする。推測は「〜の可能性があります」と明示する
- 40〜80 文字、1〜2 文
- 「注目されています」「話題です」など、行動に結びつかない表現は禁止
- どの観点にも当てはめられない記事は候補から落とす(重要性を説明できない記事は掲載しない)

### 5.3 説明文の見出し

説明文の見出しは固定文言にせず、`impact_axis` に応じて切り替える。見出し自体が「読み手にどう関係するのか」を示すため、観点を別バッジとして表示する必要はない。

| impact_axis | 見出し |
| --- | --- |
| `tooling` | 💼 業務での使いどころ |
| `risk` | ⚠️ 注意したい点 |
| `practice` | 🛠️ すぐ試せること |
| `learning` | 🧪 勉強会での使いどころ |
| `landscape` | 🗺️ 押さえておきたい背景 |

- 見出しはフロントエンドの対応表で解決し、生成データには含めない
- 生成時も観点ごとの見出しをプロンプトに提示し、見出しと本文の整合を取る

### 5.4 勉強会の文脈の自動注入

「勉強会の参加者にとって重要か」を判定するため、D1 上の既存データから直近の関心を抽出し、`GET /api/news/feedback-summary` のレスポンスに含めて選定プロンプトへ渡す。

| 情報 | 取得元 | 用途 |
| --- | --- | --- |
| 直近の議事録トピック | `minutes.topics`(直近 5 件) | 現在議論されているテーマとの関連度判定 |
| 資料のタグ | `resources.tags`(直近 30 日) | 勉強会で共有されている技術領域の把握 |
| 発表応募のテーマ | `speaker_applications.title`(`pending` / `scheduled`) | これから扱う予定のテーマの把握 |

- いずれも件数上限を設けて渡す(プロンプト肥大化の防止)
- 個人が特定される情報(応募者の email 等)は含めない
- 該当データが存在しない場合は空配列を返し、観点定義(§5.1)のみで判定する

## 6. 掲載スケジュール

| 種別 | 実行タイミング | 掲載件数 |
| --- | --- | --- |
| 日次 | 毎日 07:00 JST | 5〜8 件 |
| 週次ダイジェスト | 木曜 06:30 JST | 上位 5〜8 件 + 今週の流れ |

- routine の時刻はローカルタイムで指定でき、UTC 換算は不要(§3.1)。ただし数分のずれが生じるため、分単位の精度には依存しない。
- 日次は `daily` プリセット、週次は `weekly`(木曜)プリセットを使う。日次と週次で別々の routine を作成する。
- 木曜は週次ダイジェスト生成後に日次を実行する(週次を 30 分先行させる)。
- 実行失敗時は当日分が欠けるだけで、翌営業日の実行に影響しない(掲載済み URL の除外により重複は起きない)。

## 7. ランキング

### 7.1 掲載後の並び順

```text
final_score = ai_score + VOTE_COEFFICIENT × (up_count − down_count)
```

- `ai_score`: LLM が候補に付与する 0〜100 の重要度スコア
- `VOTE_COEFFICIENT`: 初期値 4(1 票がスコア 4 点に相当)
- 並びは `final_score` の降順、同点時は `ai_score` の降順
- 掲載直後は投票が 0 のため AI スコア順、以後は投票で順位が動く

### 7.2 評価の次回選定への反映

評価は「重みテーブルによる機械的補正」と「選定プロンプトへの傾向注入」の 2 経路で反映する。

**(a) 重みによる機械的補正**

出典(source)・カテゴリ(category)・観点(impact_axis)の 3 軸それぞれについて、👍 / 👎 の累計から重みを算出する。

```text
weight(axis) = clamp(1 + 0.3 × (up − down) / (up + down + 5), 0.7, 1.3)
adjusted_score = ai_score × clamp(w_source × w_category × w_impact_axis, 0.7, 1.4)
```

- 分母の平滑化項(+5)により、票数が少ないうちは重みが 1.0 付近に留まる
- 個別重みと積の両方をクランプし、3 軸が同方向に振れたときの過補正を防ぐ
- 集計テーブルは持たず、`feedback-summary` の取得時に `news_votes` と `news_articles` の JOIN から算出する(集計値の不整合を避けるため)

**(b) 選定プロンプトへの傾向注入**

直近 30 日の集計から、👍 比率の高いタグ上位 10 件と 👎 の多いタグ上位 10 件を抽出し、選定プロンプトに「参加者に好まれる傾向 / 好まれない傾向」として渡す。タグでは表現しきれない観点(例:ツール紹介より実務事例が好まれる)を LLM の判断に委ねる。あわせて §5.4 の勉強会の文脈も同じプロンプトへ渡す。

## 8. 画面要件

画面は Claude Design のデザイン案「紙面型」(プロジェクト `nportal ニュースページ デザイン案比較` の `News Page.dc.html`)を正とする。カードの箱を使わず、罫線と余白で区切った番号付きの一覧に圧縮する構成である。

### 8.1 ページ構成

- URL: `/news`(単一ページ、タブ切替)
- ヘッダーナビゲーションの「発表募集」の右に「ニュース」を追加する
- 認証は既存の Cloudflare Access に準拠する(`/news` を認証必須パスに追加)
- ページ見出しは `AI NEWS` のラベルと大見出し。最新の掲載日を表示しているときは「今日のAIニュース」、過去日を遡っているときは「AIニュース」とする
- 見出しの右に「最終更新」時刻を出す(当日分の投入時刻の最大値。`/api/news` の `updatedAt`)
- タブ(「今日」/「週次ダイジェスト」)と掲載日ナビを 1 本のバーにまとめ、サイトヘッダーの直下に固定表示する

**日本語の折り返し**

日本語は既定で文字単位に折り返せるため、「重な / り」「チャ / ンク」のように単語の途中で改行される。本文・見出しには `word-break: auto-phrase`(文節単位の折り返し)と `line-break: strict`(小書き仮名・長音符の行頭禁則)を指定する。文節解析は言語指定を前提とするため、`<html lang="ja">` を設定する。未対応のブラウザでは既定の折り返しにフォールバックする。

`text-wrap: pretty` は使わない。英文の最終行を整える指定であり、文字単位で折り返せる日本語ではかえって行末が揃わないため。

**掲載日の導線**

掲載日は日々増え続けるため、全件を列挙するセレクトは採用しない。

- タブバーの右で「←」「→」により前後の掲載日へ移動する(存在しない側はボタンを無効化)
- 中央に現在の掲載日を「2026年7月31日 (金)」形式で表示する
- 指定日に掲載がない場合は、サーバー側で**直前の掲載日へ解決**する(空表示にしない)

### 8.2 記事一覧(日次)

```text
──────────────────────────────────────────────
01   プロダクト  OpenAI・7/30
     OpenAI、文字起こしAI「GPT Transcribe」を一般公開
     会議音声に特化した新しい文字起こしモデルを公開。用語辞書の
     登録と話者分離に対応し、日本語と英語が混ざる会議でも…
                ────────                        👍 12　👎 1
     要点と観点を見る ▾   元記事 →
──────────────────────────────────────────────
```

各記事は 3 カラム構成とする。

| 位置 | 内容 |
| --- | --- |
| 左(52px) | 順位番号(`01` 形式のゼロ埋め、淡色) |
| 中央 | カテゴリチップ、出典名・記事公開日、見出し、要点まとめ、操作行、展開ブロック |
| 右(100px) | 👍 / 👎 の件数(狭い画面では非表示) |

- **要点まとめ**は全文を表示する(散文 120〜180 字、箇条書きは使わない)
- 用語注は本文中の該当語に点線の下線を引き、**ホバー / タップ / キーボードフォーカス**で説明を表示する
- 操作行に「要点と観点を見る ▾」トグルと「元記事 →」リンクを並べる
- トグルを開くと、左罫線付きのブロックに**観点ラベル**(§5.3)と説明文を表示する。既定は閉じた状態
- タグはカードに表示しない(データとしては保持し、ランキング学習に用いる)

**カテゴリ**

カテゴリは以下の 4 分類に固定し、チップの配色で区別する。取り込み API では 4 分類以外を 400 とする。

| カテゴリ | 配色 |
| --- | --- |
| プロダクト | sky |
| 規制・リスク | amber |
| 研究 | violet |
| 事例 | teal |

**用語注のマークアップ**

要点まとめ本文の中で、用語注に対応する語を `[[用語]]` で囲む。

```text
用語辞書の登録と[[話者分離]]に対応し、日本語と英語が混ざる会議でも…
```

- 画面側は `[[…]]` を `glossary` の `term` と突き合わせ、一致した語をホバー対象として描画する
- 一致する用語注がない `[[…]]` は素のテキストとして表示する(表示が壊れない)
- 用語注は 1 記事あたり 0〜3 件を目安とし、初心者がつまずく語に絞る

### 8.3 週次ダイジェストタブ

- 対象期間のラベル(`2026.07.24 — 07.30` 形式。掲載日から遡る 7 日間)
- 大見出し「今週の{件数}つの動き」
- 「今週の AI 動向」の要約本文(3〜5 文)。本文中の改行は段落の区切りとして扱い、段落ごとに `<p>` で組む
- 続けて評価上位の記事を一覧表示する。順位は週次時点の `final_score` 順で固定する
- 週次の記事行は日次より簡素にし、要点まとめは**全文**を表示する。観点の展開と投票件数は表示しない(用語注の下線も付けない)
- 見出しから直接元記事へリンクする

### 8.4 空状態・エラー

- 当日分が未生成の場合は「本日のニュースはまだ公開されていません」と表示する
- 取得失敗時は既存ページと同様のエラー表示に従う

## 9. 投票仕様

- 1 ユーザー(Cloudflare Access の email)につき 1 記事 1 票
- 👍 → 👎 の押し直し、および同じボタン再押下による取り消しが可能
- 合計件数は全員に公開する。誰が投票したかは公開しない
- 過去の掲載日の記事にも投票できる
- 投票の変更は即座に並び順へ反映される(再読み込み時)。押した直後に行が並び替わると操作対象を見失うため、その場では件数のみ更新する
- 送信は楽観的更新とし、失敗時は件数を元に戻して行内にエラーを表示する
- 投票ボタンは狭い画面でも操作できるよう、本文の下に折り返して表示する

## 10. データモデル

`db/schema.sql` に以下を追加する(既存方針どおり `CREATE TABLE IF NOT EXISTS` のみ)。

```sql
CREATE TABLE IF NOT EXISTS news_articles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  published_date TEXT NOT NULL,           -- 掲載日 (JST, YYYY-MM-DD)
  url            TEXT NOT NULL UNIQUE,    -- 正規化済み URL
  title          TEXT NOT NULL,
  source         TEXT NOT NULL,           -- 出典名
  category       TEXT NOT NULL,           -- プロダクト / 研究 / 事例 / 規制 など
  impact_axis    TEXT NOT NULL,           -- tooling / risk / practice / learning / landscape
  tags           TEXT NOT NULL DEFAULT '[]',
  summary        TEXT NOT NULL DEFAULT '',    -- 要点まとめ本文（用語は [[用語]] で囲む）
  why_important  TEXT NOT NULL DEFAULT '',
  glossary       TEXT NOT NULL DEFAULT '[]',  -- 用語注 [{term, description}]
  ai_score       INTEGER NOT NULL DEFAULT 0,  -- 0-100
  article_date   TEXT,                    -- 元記事の公開日
  hidden_at      TEXT,                    -- 管理者による非表示
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES news_articles(id),
  user_email TEXT NOT NULL,
  value      INTEGER NOT NULL,            -- 1 = 👍 / -1 = 👎
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(article_id, user_email)
);

CREATE TABLE IF NOT EXISTS news_digests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  published_date TEXT NOT NULL UNIQUE,    -- 週次の掲載日 (木曜)
  overview       TEXT NOT NULL DEFAULT '',-- 今週の流れ
  article_ids    TEXT NOT NULL DEFAULT '[]',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_articles_date ON news_articles(published_date);
CREATE INDEX IF NOT EXISTS idx_news_votes_article ON news_votes(article_id);
```

- `news_signal_stats` テーブルは設けず、重みは `news_votes` と `news_articles` の JOIN で都度算出する(データ量が小さく、集計値の二重管理を避けるため)。件数増加でクエリが重くなった場合に集計テーブルの導入を再検討する。
- 記事は無期限に保持する(過去日を遡れる要件のため)。

## 11. API 要件

### 11.1 閲覧系(Cloudflare Access 認証)

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | `/api/news` | `?date=YYYY-MM-DD` の日次記事一覧。`final_score` 降順。自分の投票状態、最終更新時刻(`updatedAt`)、前後の掲載日(`prevDate` / `nextDate`)を含む。指定日に掲載がなければ直前の掲載日に解決し、省略時は最新 |
| GET | `/api/news/weekly` | `?date=` の週次ダイジェスト(overview + 記事一覧 + 前後の掲載日)。解決規則は上と同じ |
| POST | `/api/news/:id/vote` | `{ value: 1 \| -1 \| 0 }`。0 は取り消し。UPSERT で 1 人 1 票を保証 |

### 11.2 連携系(Bearer トークン認証)

| メソッド | パス | 概要 |
| --- | --- | --- |
| GET | `/api/news/feedback-summary` | 出典 / カテゴリ / 観点別の重み、タグ別の 👍👎 集計、勉強会の文脈(§5.4)、直近 14 日の掲載記事(評価付き)を返す |
| POST | `/api/news/ingest` | 日次記事または週次ダイジェストを投入する |

**認証方式**


- `Authorization: Bearer <NEWS_INGEST_TOKEN>` で認証する。比較は入力長に依存しない定数時間比較で行う
- `NEWS_INGEST_TOKEN` は Cloudflare Pages の環境変数(Secret)として設定し、リポジトリには含めない
- `server/middleware/auth.ts` は現在 `/api/` 配下すべてを Access 必須としているため、`/api/news/ingest` と `/api/news/feedback-summary` をトークン認証で通す例外分岐を追加する
- クラウドタスクは Cloudflare Access の保護も通過する必要があるため、サービストークン(`CF-Access-Client-Id` / `CF-Access-Client-Secret`)を併用する。LLM プロキシと同じ方式(`server/utils/llm.ts` 参照)

**`POST /api/news/ingest` のリクエスト形式**

```jsonc
{
  "type": "daily",              // "daily" | "weekly"
  "published_date": "2026-08-03",
  "articles": [
    {
      "url": "https://...",
      "title": "…",
      "source": "ITmedia AI+",
      "category": "プロダクト",
      "impact_axis": "tooling",   // §5.1 の 5 分類のいずれか
      "tags": ["推論", "コスト"],
      "summary": "[[推論時間スケーリング]]を可変にできる新方式を採用し、…",
      "why_important": "…",
      "glossary": [{ "term": "…", "description": "…" }],
      "ai_score": 82,
      "article_date": "2026-08-02"
    }
  ],
  // type = "weekly" のときは articles ではなく以下を使う
  "overview": "…",
  "article_urls": ["https://…", "https://…"]
}
```

週次は既存記事の再掲であるため、記事データを再送せず URL のみを渡す。サーバー側で URL から記事 ID を解決し、渡された順序のまま `news_digests.article_ids` に保存する。解決できなかった URL は `missingUrls` として返す。

- 同一 `published_date` への再投入では**既存レコードを削除しない**。記事には投票が紐づくため、削除すると評価が失われる。URL 重複をスキップすることで冪等性を担保する
- スキップ件数はレスポンス(`inserted` / `skipped`)に含める
- 週次(`news_digests`)は `published_date` で UPSERT する(記事本体を持たないため置き換えて問題ない)
- 入力は必須項目・型・配列長を検証し、不正な場合は 400 を返す。`impact_axis` が §5.1 の 5 分類以外の場合も 400 とする
- `summary` 中の `[[…]]` に対応する `glossary` の項目がない場合も 400 とする(用語注の付け忘れを検出する)
- `category` が §8.2 の 4 分類以外の場合も 400 とする

**`GET /api/news/feedback-summary` のレスポンス形式**

```jsonc
{
  "weights": {
    "source":      { "ITmedia AI+": 1.12, "Publickey": 0.94 },
    "category":    { "プロダクト": 1.08 },
    "impact_axis": { "tooling": 1.21, "landscape": 0.83 }
  },
  "tags": {
    "liked":    [{ "tag": "コスト", "up": 24, "down": 2 }],
    "disliked": [{ "tag": "資金調達", "up": 1, "down": 9 }]
  },
  "study_group_context": {
    "recent_topics":     ["RAG の精度改善", "議事録の自動要約"],
    "resource_tags":     ["Claude", "Cloudflare", "評価"],
    "upcoming_sessions": ["Workers での RAG 実装を試した話"]
  },
  "recent_articles": [
    {
      "url": "https://…",
      "title": "…",
      "published_date": "2026-08-03",
      "source": "ITmedia AI+",
      "category": "プロダクト",
      "impact_axis": "tooling",
      "tags": ["推論", "コスト"],
      "up": 12,
      "down": 1,
      "final_score": 126
    }
  ]
}
```

`recent_articles` は直近 14 日の掲載記事を、掲載日の新しい順・`final_score` の高い順で返す。日次では重複除外に、週次では上位再掲の選定に用いる。

## 12. 管理機能

- 管理者(`ADMIN_EMAILS`)は記事を非表示(`hidden_at` を設定)にできる。誤情報や社内公開に適さない記事への対処用
- 生成の手動再実行は管理画面からは行わず、クラウドタスクの再実行で対応する
- 管理 UI は既存の `/admin` 配下に最小構成で追加する

## 13. 非機能要件

- ページの初回表示で発行する API は 1 リクエストに収める(記事・投票状態を同時に返す)
- 投票 API は楽観的 UI 更新とし、失敗時にロールバックする
- LLM 呼び出しはクラウドタスク側で完結するため、閲覧時の LLM 呼び出しは発生しない
- `NEWS_INGEST_TOKEN` の失効・ローテーション手順を `docs/operation.md` に追記する

## 14. 段階的な実装方針

| フェーズ | 内容 | 完了条件 |
| --- | --- | --- |
| 0 ✅ | 到達性検証(§3.2)とクラウド環境の作成 | 完了(2026-07-31、16/16 項目 OK) |
| — | **`main` merge 後に本番 D1 へ `npm run db:schema:prod` を実行する** | `news_*` の 3 テーブルが本番に存在する |
| 1 ✅ | D1 スキーマ、閲覧 API、`/news` ページ | 完了(プレビュー D1 のサンプルデータで表示を確認) |
| 2 ✅ | 投票 API と UI、`final_score` による並び替え | 完了(2026-07-31) |
| 3 ✅ | `ingest` / `feedback-summary` API とトークン認証 | 完了(2026-07-31) |
| 4 | クラウドタスク(日次)の作成と定期実行 | 手順書 [docs/news-routine.md](news-routine.md) とスクリプトを用意済み。routine の登録待ち |
| 5 | 週次ダイジェストの生成とタブ表示 | タブ表示と生成手順は実装済み。routine の登録とマージ後の初回実行で確認する |

## 15. 未決事項

- `VOTE_COEFFICIENT` および重み補正係数の初期値(運用開始後に投票数を見て調整する)
- 勉強会の文脈として渡す各項目の件数上限
- routine の 1 日あたり実行上限が日次 + 週次の運用に足りるか(運用開始後に確認する)
