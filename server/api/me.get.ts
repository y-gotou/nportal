export default defineEventHandler((event) => {
  const user = event.context.user as { email: string } | undefined;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const env = (
    event.context.cloudflare as { env?: Record<string, string | undefined> } | undefined
  )?.env;
  const adminEmails = (env?.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    user: {
      email: user.email,
      isAdmin: adminEmails.includes(user.email),
    },
  };
});
