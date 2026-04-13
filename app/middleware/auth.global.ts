import { fetchCurrentUser } from "~/composables/useCurrentUser";

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const user = await fetchCurrentUser();

  if (!user) {
    return navigateTo("/login");
  }
});
