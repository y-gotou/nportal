import { sendRedirect } from "h3";

export default defineEventHandler((event) => {
  const env = (
    event.context.cloudflare as
      | { env?: Record<string, string | undefined> }
      | undefined
  )?.env;

  const teamDomain = env?.CF_ACCESS_TEAM_DOMAIN;
  const logoutUrl = teamDomain
    ? `https://${teamDomain}/cdn-cgi/access/logout`
    : "/login";

  return sendRedirect(event, logoutUrl, 302);
});
