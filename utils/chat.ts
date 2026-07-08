export const MAX_CHAT_BODY_LENGTH = 2000;

// AI アシスタントの投稿者識別子(実在しないドメインで通常ユーザーと衝突しない)
export const CHAT_AI_EMAIL = "ai-assistant@nportal.local";

export const CHAT_AI_DISPLAY_NAME = "AI アシスタント";

// 本文に @AI メンションが含まれるか(直前が行頭・空白・記号。メールアドレス等は除外)
export function hasChatAiMention(body: string): boolean {
  return /(^|[^\w@])@ai\b/i.test(body);
}

export const CHAT_QUICK_REACTION_EMOJIS = ["👍", "😀", "😮", "😢"] as const;

export const CHAT_EMOJIS = [
  "👍", "👎", "😀", "😆", "😅", "🤣", "😮", "😢", "😍", "🤔",
  "🙏", "👏", "🙌", "💪", "🎉", "✨", "🔥", "💯", "❤️", "💡",
  "✅", "❌", "⭕", "❓", "❗", "👀", "🚀", "📝", "🤖", "🎓",
] as const;

export function isChatEmoji(value: string): boolean {
  return (CHAT_EMOJIS as readonly string[]).includes(value);
}

// 画像スタンプ(public/stamps/<id>.png)
export const CHAT_STICKERS = [
  { id: "naruhodo", label: "なるほど" },
  { id: "iidesune", label: "いいですね" },
  { id: "kansha", label: "感謝" },
  { id: "kakuninchu", label: "確認中" },
  { id: "hatena", label: "?" },
  { id: "atodemimasu", label: "後で見ます" },
  { id: "tsukaesou", label: "使えそう" },
  { id: "tameshitai", label: "試したい" },
] as const;

export function isChatStickerId(value: string): boolean {
  return CHAT_STICKERS.some((sticker) => sticker.id === value);
}

export function chatStickerLabel(id: string): string {
  return CHAT_STICKERS.find((sticker) => sticker.id === id)?.label ?? "スタンプ";
}

// schedule.date(YYYY-MM-DD)の翌日以降は読み取り専用
export function isChatReadOnly(scheduleDate: string, today: string): boolean {
  return today > scheduleDate;
}

// サーバー(Cloudflare Workers)はUTC動作のため、日本時間基準の「今日」を返す
export function getChatJstToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isChatImageMimeType(mimeType: string | null | undefined): boolean {
  const base = (mimeType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  return ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(base);
}

export interface ChatBodyPart {
  type: "text" | "link";
  value: string;
}

// XSS対策: v-htmlを使わず、本文をテキストとリンクに分割してレンダリングする
export function splitChatBody(body: string): ChatBodyPart[] {
  const parts: ChatBodyPart[] = [];
  const pattern = /https?:\/\/[^\s<>"']+/g;
  let lastIndex = 0;

  for (const match of body.matchAll(pattern)) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) });
  }

  return parts;
}

// created_at(SQLiteのdatetime('now')=UTC)を日本時間のHH:MMで表示する
export function formatChatTime(createdAt: string): string {
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function chatDisplayName(email: string): string {
  if (email === CHAT_AI_EMAIL) return CHAT_AI_DISPLAY_NAME;
  return email.split("@")[0] || email;
}
