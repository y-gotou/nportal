import { createError } from "h3";

// ルートパラメータなどの正の整数 ID を検証して返す
export function parsePositiveIntParam(value: unknown, message: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: message });
  }

  return id;
}
