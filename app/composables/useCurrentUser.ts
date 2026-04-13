import type { CurrentUser, MeResponse } from "~~/types/portal";

export const useCurrentUser = () => {
  return useState<CurrentUser | null>("currentUser", () => null);
};

export async function fetchCurrentUser() {
  const user = useCurrentUser();

  if (user.value) return user.value;

  const { data } = await useFetch<MeResponse>("/api/me", {
    // エラー時はnullのまま（CF Accessが保護するため通常は発生しない）
    onResponseError: () => {},
  });

  if (data.value?.user) {
    user.value = data.value.user;
  }

  return user.value;
}
