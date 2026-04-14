import { useCurrentUser } from "~/composables/useCurrentUser";

export async function useAdminGuard() {
  const user = useCurrentUser();
  if (!user.value?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
}
