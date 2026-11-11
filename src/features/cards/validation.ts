import type { CardInput, CardKind } from "./types";
import { resolveImagePath } from "../../lib/images/resolve-image-path";

export class CardInputError extends Error {}

export function parseCardInput(value: unknown): CardInput {
  if (!value || typeof value !== "object") throw new CardInputError("卡片数据格式无效。");
  function field(key: string, maximum: number, required = false): string {
    if (!value || typeof value !== "object" || !(key in value)) {
      throw new CardInputError(`缺少字段 ${key}。`);
    }
    const text: unknown = Reflect.get(value, key);
    if (typeof text !== "string") throw new CardInputError(`${key} 必须为文字。`);
    const trimmed = text.trim();
    if ((required && !trimmed) || trimmed.length > maximum) {
      throw new CardInputError(`${key} ${required ? "不能为空且" : ""}不能超过 ${maximum} 个字符。`);
    }
    return trimmed;
  }
  const kind = field("kind", 10);
  if (!isCardKind(kind)) throw new CardInputError("卡片类型无效。");
  const link = field("link", 2048, true);
  if (/[\u0000-\u0020\\]/.test(link) || link.startsWith("//")) {
    throw new CardInputError("链接包含非法字符。");
  }
  if (!link.startsWith("/")) {
    let url: URL;
    try { url = new URL(link); } catch { throw new CardInputError("请输入有效链接。"); }
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      throw new CardInputError("链接仅支持站内路径、HTTP(S) 或 mailto。");
    }
  }
  const image = field("image", 1024);
  if (image) {
    if (image.startsWith("@images/")) throw new CardInputError("图片必须使用 assets 下的相对路径。");
    try { resolveImagePath(image); } catch (error) {
      throw new CardInputError(error instanceof Error ? error.message : "图片路径无效。");
    }
  }
  const icon = field("icon", 100);
  if (!/^[A-Z][A-Za-z0-9]*$/.test(icon)) throw new CardInputError("请选择有效的 MUI 图标。");
  return {
    kind, title: field("title", 200, true), username: field("username", 200),
    link, description: field("description", 10000), image, icon,
  };
}

export function isCardKind(value: string): value is CardKind {
  return value === "connect" || value === "project" || value === "article";
}
