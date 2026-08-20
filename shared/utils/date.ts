// YYYY-MM-DD 形式
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// UTC 動作の環境で日本時間の「今日」(YYYY-MM-DD)を返す
export function jstToday(now: number = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// UTC の今日(YYYY-MM-DD)
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// UTC の今日から days 日前(YYYY-MM-DD)
export function utcDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

// UTC 日付文字列(YYYY-MM-DD)を days 日ずらす
export function addUtcDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

// D1 の datetime('now')(UTC の "YYYY-MM-DD HH:MM:SS")を Date にする
export function parseD1Timestamp(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

// "YYYY-MM-DD" をローカルタイムの 0 時として Date にする
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}
