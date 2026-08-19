import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  return { user: requireUser(event) };
});
