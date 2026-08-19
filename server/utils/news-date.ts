import { createError } from "h3";
import { DATE_PATTERN } from "../../shared/utils/date.ts";

// クエリパラメータの date を検証する。未指定なら undefined を返す。
export function parseNewsDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = String(value);

  if (!DATE_PATTERN.test(date)) {
    throw createError({
      statusCode: 400,
      statusMessage: "date must be in YYYY-MM-DD format.",
    });
  }

  return date;
}
