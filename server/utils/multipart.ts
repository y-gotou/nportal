import type { readMultipartFormData } from "h3";

type MultipartData = Awaited<ReturnType<typeof readMultipartFormData>>;

// name に一致するテキストフィールドを取り出す(既定で trim する)
export function getTextField(
  parts: MultipartData,
  name: string,
  options: { trim?: boolean } = {},
): string {
  const value =
    parts?.find((item) => item.name === name && !item.filename)?.data.toString("utf8") ?? "";
  return options.trim === false ? value : value.trim();
}

// name に一致する空でないファイルパートを取り出す
export function getFilePart(parts: MultipartData, name = "file") {
  return parts?.find((item) => item.name === name && item.filename && item.data.byteLength > 0);
}

export function getFileParts(parts: MultipartData, name: string) {
  return (
    parts?.filter((item) => item.name === name && item.filename && item.data.byteLength > 0) ?? []
  );
}
