export default defineEventHandler((event) => {
  const user = event.context.user as { email: string } | undefined;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return { user };
});
