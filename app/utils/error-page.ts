// エラーページの見出しと説明。内部の英語メッセージ(statusMessage)は画面に出さない
export function errorPageContent(statusCode: number | undefined) {
  if (statusCode === 404) {
    return {
      heading: "ページが見つかりません",
      description: "お探しのページは存在しないか、移動または削除された可能性があります。",
    };
  }
  return {
    heading: "エラーが発生しました",
    description: "時間をおいて再度お試しください。",
  };
}
