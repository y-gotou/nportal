import type { CurrentUser, MeResponse } from "~~/types/portal";

// クライアント側: ハイドレーション後もユーザー情報が未設定の場合に /api/me をフェッチ
// プリレンダーページ（/、/minutes 等）ではサーバープラグインが動かないためこちらで補完
export default defineNuxtPlugin(async () => {
  const currentUser = useState<CurrentUser | null>("currentUser", () => null);

  if (currentUser.value) return;

  try {
    const data = await $fetch<MeResponse>("/api/me");
    if (data?.user) {
      currentUser.value = data.user;
    }
  } catch {
    // 未認証の場合は何もしない（CF Access が認証を管理）
  }
});
