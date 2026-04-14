import type { CurrentUser } from "~~/types/portal";

export default defineEventHandler((event) => {
  const user = event.context.user as CurrentUser | undefined;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return { user };
});
