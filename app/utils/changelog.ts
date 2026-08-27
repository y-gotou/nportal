export type ChangelogCategory = "feature" | "improvement" | "fix";

export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  category: ChangelogCategory;
  title: string;
  description?: string;
}

export const changelogCategoryLabels: Record<ChangelogCategory, string> = {
  feature: "新機能",
  improvement: "改善",
  fix: "不具合修正",
};

// 同じ日の中でのカテゴリの表示順
export const changelogCategoryOrder: ChangelogCategory[] = [
  "feature",
  "improvement",
  "fix",
];

// w-20 は最長ラベル「不具合修正」が収まる幅。ラベルを変更する場合は幅も見直す
export const changelogCategoryBadgeClass =
  "inline-flex w-20 shrink-0 justify-center rounded-full px-2 py-1 text-xs font-medium";

export const changelogCategoryClasses: Record<ChangelogCategory, string> = {
  feature: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  improvement:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  fix: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
};

// 運用ルール: 一般ユーザーの体験が変わる変更のみ記載する。
// 内部変更(ドキュメント・運用改善等)と、管理者向け機能(管理画面のみで完結する変更)は記載しない。
// 機能追加・変更の PR で、この配列の先頭に 1 項目を追記する。
export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-08-27",
    category: "improvement",
    title: "議事録のキーワード検索が本文にも対応",
    description:
      "タイトル・トピックに加えて議事録の本文も検索対象にし、本文にだけ登場する語でも探せるようにしました。",
  },
  {
    date: "2026-08-20",
    category: "improvement",
    title: "発表申し込みフォームの誤操作対策",
    description:
      "入力途中にフォームの外側をクリックしても、確認なしに閉じて入力内容が失われないようにしました。",
  },
  {
    date: "2026-08-12",
    category: "feature",
    title: "更新情報ページを公開",
    description:
      "アカウントメニューから、サイトの新機能・改善のお知らせを確認できるようにしました。",
  },
  {
    date: "2026-08-06",
    category: "improvement",
    title: "ヘッダーに BBS へのリンクを追加",
    description: "ナビゲーションから BBS(別サイト)を開けるようにしました。",
  },
  {
    date: "2026-08-06",
    category: "improvement",
    title: "週次ニュースダイジェストの品質を改善",
    description: "記事の選定基準と概況文の生成を見直しました。",
  },
  {
    date: "2026-08-06",
    category: "fix",
    title: "ニュースの掲載日のずれを修正",
    description:
      "掲載日が実際の日付とずれる場合がある問題を修正し、再発を防ぐ検証を追加しました。",
  },
  {
    date: "2026-08-06",
    category: "improvement",
    title: "議事録からチャットへ移動できるように",
    description:
      "議事録詳細画面に、対応する回のチャットへの遷移ボタンを追加しました。",
  },
  {
    date: "2026-08-03",
    category: "feature",
    title: "Markdown 資料への画像添付",
    description:
      "資料共有の Markdown 資料に画像を添付して表示できるようにしました。",
  },
  {
    date: "2026-08-03",
    category: "improvement",
    title: "ニュース記事の選定品質を改善",
    description:
      "特定サイトへの偏りやノイズ記事を減らすよう、記事の収集・選定処理を見直しました。",
  },
  {
    date: "2026-07-31",
    category: "feature",
    title: "AI ニュースページを公開",
    description:
      "AI 関連の最新ニュースを毎日自動で収集・掲載する「ニュース」ページを追加しました。",
  },
  {
    date: "2026-07-08",
    category: "feature",
    title: "会議チャットに AI アシスタントを追加",
    description: "チャットで @AI にメンションすると AI が応答するようになりました。",
  },
  {
    date: "2026-06-12",
    category: "feature",
    title: "会議ごとのチャット機能",
    description: "スケジュールの各回ごとにチャットルームを利用できるようにしました。",
  },
  {
    date: "2026-06-12",
    category: "improvement",
    title: "資料共有で HTML ファイルの投稿を許可",
  },
  {
    date: "2026-05-22",
    category: "fix",
    title: "アンケート結果の改行が表示されない問題を修正",
  },
  {
    date: "2026-05-15",
    category: "feature",
    title: "Markdown 資料のプレビュー表示",
    description:
      "資料共有で Markdown 資料をページ内でそのまま閲覧できるようにしました。",
  },
  {
    date: "2026-05-15",
    category: "improvement",
    title: "資料のリンクを同じタブで開くように変更",
  },
  {
    date: "2026-05-12",
    category: "feature",
    title: "ダークモードに対応",
    description:
      "アカウントメニューからライトモード / ダークモードを切り替えられるようにしました。",
  },
  {
    date: "2026-05-07",
    category: "improvement",
    title: "zip ファイルの投稿を管理者のみに制限",
    description: "安全性確保のため、zip 資料のアップロードを管理者に限定しました。",
  },
  {
    date: "2026-04-27",
    category: "fix",
    title: "日本語ファイル名の資料が文字化けする問題を修正",
  },
  {
    date: "2026-04-27",
    category: "feature",
    title: "資料の投稿機能を追加",
    description:
      "資料共有ページから、ファイルアップロード付きで誰でも資料を投稿できるようにしました。",
  },
  {
    date: "2026-04-24",
    category: "improvement",
    title: "アンケート回答を受付中は修正可能に",
    description: "回答済みでも、受付期間中であれば回答を修正できるようにしました。",
  },
  {
    date: "2026-04-23",
    category: "fix",
    title: "アンケート回答者数の集計を修正",
  },
  {
    date: "2026-04-15",
    category: "feature",
    title: "不具合・要望報告フォームを追加",
    description:
      "アカウントメニューから、サイトの不具合や要望を報告できるようにしました。",
  },
  {
    date: "2026-04-15",
    category: "feature",
    title: "発表募集ページを公開",
    description: "勉強会での発表を応募できる「発表募集」ページを追加しました。",
  },
  {
    date: "2026-04-14",
    category: "improvement",
    title: "モバイル向けメニューを追加",
    description:
      "スマートフォンでもハンバーガーメニューから各ページへ移動できるようにしました。",
  },
  {
    date: "2026-04-14",
    category: "feature",
    title: "ログインとアカウントメニューに対応",
    description:
      "Cloudflare Access によるログインに対応し、ヘッダーにアカウントメニューを追加しました。",
  },
  {
    date: "2026-03-31",
    category: "feature",
    title: "N Portal を公開",
    description:
      "ホーム・議事録・スケジュール・アンケート・資料共有を備えた社内 AI 勉強会ポータルを公開しました。",
  },
];
