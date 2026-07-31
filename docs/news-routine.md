# AI ニュース routine 手順書

- 作成日: 2026-07-31

Claude Code の Routines から実行する日次・週次の掲載手順である。routine のプロンプトにはこのファイルを参照する短い指示だけを置き、手順の実体はここで管理する。

要件の背景は [docs/requirements-news.md](requirements-news.md) を参照。

## 前提

- 実行環境はニュース専用のクラウド環境(Custom ネットワークアクセス)
- 必要な環境変数: `NPORTAL_BASE_URL` / `NEWS_INGEST_TOKEN` / `NPORTAL_CF_ACCESS_CLIENT_ID` / `NPORTAL_CF_ACCESS_CLIENT_SECRET` / `TAVILY_API_KEY`
- 依存パッケージのインストールは不要(`npm install` は実行しない)

## routine に設定するプロンプト

### 日次(平日 07:00)

```text
docs/news-routine.md の「日次の手順」に従って、本日分の AI ニュースを掲載してください。
掲載後、選定した記事の見出しと観点の一覧を報告してください。
```

### 週次(木曜 06:30)

```text
docs/news-routine.md の「週次の手順」に従って、今週の週次ダイジェストを掲載してください。
掲載後、選んだ記事の見出しと今週のまとめ文を報告してください。
```

## 日次の手順

### 1. 候補を収集する

```bash
node scripts/news-collect.mjs "$NPORTAL_BASE_URL" --days 3 --out /tmp/candidates.json
```

出力される JSON の構造は以下のとおり。

- `feedback.weights` — 出典 / カテゴリ / 観点それぞれの重み(0.7〜1.3)
- `feedback.tags.liked` / `disliked` — 直近 30 日のタグ別評価
- `feedback.study_group_context` — 直近の議事録トピック、資料タグ、発表予定
- `feedback.published_urls` — 直近 14 日の掲載済み URL(収集時点で除外済み)
- `candidates[]` — `source` / `url` / `title` / `publishedAt` / `body` / `origin`
- `warnings[]` — 取得に失敗したフィードなど

`warnings` が出ていても処理は続行する。ただし報告には含める。

### 2. 記事を選定する

候補から **5〜8 件**を選ぶ。判断基準は requirements-news.md §5 に従う。

1. 各候補に `ai_score`(0〜100)を付ける。観点ごとの目安は §5.1 の表のとおり
2. `adjusted = ai_score × weights.source × weights.category × weights.impact_axis` を計算する(積は 0.7〜1.4 に丸める)
3. `adjusted` の高い順に選ぶ
4. `feedback.tags` の傾向と `study_group_context` を、どの話題を優先するかの判断に使う
5. 同一トピックの重複記事は 1 件に集約する。一次情報(ベンダー公式)を優先する
6. **どの観点にも当てはめられない記事は落とす**。件数が 5 件に満たなくてもよい

### 3. 掲載データを組み立てる

`/tmp/payload.json` に以下の形式で書き出す。`published_date` は実行日(JST)。

```jsonc
{
  "type": "daily",
  "published_date": "2026-08-03",
  "articles": [
    {
      "url": "https://…",
      "title": "…",
      "source": "ITmedia AI+",
      "category": "プロダクト",
      "impact_axis": "tooling",
      "tags": ["推論", "コスト"],
      "summary": "[[推論時間スケーリング]]を可変にできる新方式を採用し、…",
      "why_important": "…",
      "glossary": [{ "term": "推論時間スケーリング", "description": "…" }],
      "ai_score": 82,
      "article_date": "2026-08-02"
    }
  ]
}
```

**執筆ルール**

| 項目 | ルール |
| --- | --- |
| `title` | 平易な日本語。原題が分かりにくければ言い換える |
| `summary` | 要点まとめの散文 120〜180 字。箇条書きにしない。用語注に対応する語は `[[…]]` で囲む |
| `why_important` | 40〜80 字、1〜2 文。主語は読み手(勉強会の参加者)。推測は「〜の可能性があります」と明示する。「注目されています」など行動に結びつかない表現は禁止。特定の社内システムの導入を既定事実として書かない |
| `glossary` | 0〜3 件。初心者がつまずく語に絞る。`summary` 中の `[[…]]` と 1 対 1 で対応させる |
| `category` | `プロダクト` / `規制・リスク` / `研究` / `事例` のいずれか |
| `impact_axis` | `tooling` / `risk` / `practice` / `learning` / `landscape` のいずれか |
| `tags` | 2〜4 件。評価の学習に使うため、媒体名ではなく話題を表す語にする |

記事本文をそのまま転載しない。要約は自分の言葉で書く。

### 4. 投入する

```bash
node scripts/news-publish.mjs "$NPORTAL_BASE_URL" /tmp/payload.json
```

`inserted` と `skipped` が返る。`skipped` は掲載済み URL の重複であり、異常ではない。

HTTP 400 が返った場合はメッセージに従って `/tmp/payload.json` を修正し、再実行する。同じ URL は二重に登録されないため、再実行しても安全である。

## 週次の手順

木曜の朝、日次より先に実行する。

### 1. 直近 1 週間の掲載記事を取得する

```bash
curl -s "$NPORTAL_BASE_URL/api/news/feedback-summary" \
  -H "Authorization: Bearer $NEWS_INGEST_TOKEN" \
  -H "CF-Access-Client-Id: $NPORTAL_CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $NPORTAL_CF_ACCESS_CLIENT_SECRET"
```

`published_urls` に直近 14 日の掲載済み URL が入る。各掲載日の記事と評価は `/api/news?date=YYYY-MM-DD` では取得できない(閲覧 API は Access のユーザー認証が必要)ため、対象記事は `published_urls` と当週の日次実行時の記録から判断する。

### 2. 上位を選び、まとめを書く

- 直近 7 日の掲載記事から **5〜8 件**を選ぶ
- 「今週の AI 動向」を 3〜5 文で書く。個別の記事紹介ではなく、週全体の流れを述べる
- 木曜 16:00 の会議で画面共有する前提のため、会議の導入として読める文章にする

### 3. 投入する

`/tmp/weekly.json` に以下を書き出して投入する。記事データは再送せず URL のみを渡す。

```jsonc
{
  "type": "weekly",
  "published_date": "2026-08-06",
  "overview": "今週は…",
  "article_urls": ["https://…", "https://…"]
}
```

```bash
node scripts/news-publish.mjs "$NPORTAL_BASE_URL" /tmp/weekly.json
```

`missingUrls` が空でない場合、その URL は掲載記事として登録されていない。誤りがないか確認する。

## 失敗時の扱い

- 実行に失敗した日は掲載が欠けるだけで、翌営業日に影響しない
- 掲載済み URL は収集時点で除外されるため、再実行しても重複しない
- 収集元の一部が落ちていても `warnings` に記録して続行する
