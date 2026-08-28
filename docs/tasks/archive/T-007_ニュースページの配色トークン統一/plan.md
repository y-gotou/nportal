# T-007 実装計画

## 設計判断

- `app/pages/news.vue` の最外周にある色付きラッパー `<div class="min-h-[calc(100vh-73px)] bg-[#eceff3] dark:bg-[#0b1120]">` を削除し、`<PageContainer size="wide">` をページのルートにする。これによりページ背景は `app/layouts/default.vue` の `bg-background` が適用され、他ページと同一になる。ヘッダー高さの直値 `calc(100vh-73px)` も同時に解消する。`size="wide"` は既定値と同じだが、他ページの記述に合わせて明示する。
- 本文パネルの影 `shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)]` を `shadow-sm` に置き換える。枠線と背景は既に `border-border` / `bg-surface` を使用しているため変更しない。`app/utils/ui.ts` の `surfaceCardClass` は `p-6` を含み、パネル内の各節が固有の余白(`px-6 md:px-12`)を持つ本ページでは適用できないため、定数の import ではなくクラス指定を揃える方針とする。
- 要点まとめの本文色 `text-slate-600 dark:text-slate-300` を `text-muted` に置き換える(`NewsArticleRow.vue` / `NewsDigestRow.vue`)。パネルの背景は `bg-surface` のままであり、他ページのカード上の本文と同じ配色になる。
- `NewsTerm.vue` の用語注ポップオーバーの影 `shadow-[0_14px_30px_-14px_rgba(15,23,42,0.4)]` を `shadow-lg` に置き換える。受入条件 1 の「影の直値指定が残っていない」に該当し、`SiteHeader.vue` のユーザーメニュー(`shadow-lg`)と同じ扱いに揃う。角丸 `rounded-[10px]` はレイアウト指定のため変更しない。
- パネルには従来どおり `overflow-hidden` を付けない(付けるとタブバーの `sticky` が無効化されるため。commit `17f6c69` の既知事項)。
- テストは既存の `tests/*-page.test.mjs` と同じ方式(`.vue` のソース文字列に対する assert)で `tests/news-page.test.mjs` を追加する。Vue コンポーネントの描画テスト基盤は本リポジトリに無く、既存ページのスタイル検証もこの方式で行っているため踏襲する。

## 影響範囲

- ページ背景・パネル: `app/pages/news.vue`
- 本文色: `app/components/news/NewsArticleRow.vue`、`app/components/news/NewsDigestRow.vue`
- ポップオーバーの影: `app/components/news/NewsTerm.vue`
- 自動テスト: `tests/news-page.test.mjs`(新規)
- 更新履歴: なし。既存レイアウトの配色を揃える軽微な修正のため、`app/utils/changelog.ts` へは追記しない(2026-08-28 ユーザー判断)
- 恒久仕様書: `docs/requirements-news.md` §8.1
- 回帰確認対象の画面: `/news` の日次タブ・週次ダイジェストタブ(light / dark、掲載日ナビとタブバーの固定表示、用語注のポップオーバー、記事の展開ブロック)

## 作業項目

- [x] 1. `tests/news-page.test.mjs` を追加し、実装前に失敗することを確認する。
- [x] 2. `/news` とニュース系コンポーネントの配色をトークンに置き換え、テストを通過させる。
- [x] 3. `docs/requirements-news.md` への仕様反映と、リポジトリ全体の検証を実施する。

## 検証方法

### エージェント実施

- [x] `npm test`: `/news` とニュース系コンポーネントに背景色・本文色・影の直値指定が残っていないこと、および紙面型レイアウトの構成要素(罫線ベースの一覧、パネル内見出し、タブバーの固定表示)が維持されていることを確認する。
- [x] `npm run check`: 型チェックとプロダクションビルドを確認する。
- [x] `npm run dev` と Playwright: light / dark 双方で `/news` のページ背景が他ページ(`/schedule`)と一致し、パネルが他ページのカードと同じ枠線・背景・影で表示されることをスクリーンショットで確認する。あわせて日次・週次タブの切替、掲載日ナビ、タブバーの固定表示、用語注のポップオーバー、記事の展開ブロックが従来どおり動作することを確認する。

### 実環境・ユーザー実施

- [x] なし。
