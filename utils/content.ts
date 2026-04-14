export const portalTitle = "N Portal";
export const portalDescription =
  "社内AI勉強会の議事録、予定、資料、アンケートをまとめた軽量ポータルです。";

const displayDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function getTodayDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : displayDateFormatter.format(parsedDate);
}

export function formatDisplayDateTime(date: string, time?: string) {
  return time ? `${formatDisplayDate(date)} ${time}` : formatDisplayDate(date);
}
