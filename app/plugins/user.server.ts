import type { CurrentUser } from "~~/types/portal";

// SSRページ: サーバーミドルウェアが解析したユーザー情報を useState に直接セット
// → クライアントにハイドレーション済みの状態として渡る
export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  const user = event?.context?.user as CurrentUser | undefined;

  if (user) {
    useState<CurrentUser | null>("currentUser", () => null).value = user;
  }
});
