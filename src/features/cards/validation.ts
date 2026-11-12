import type { CardInput, CardKind, CategoryMutation } from "./types";
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
  const categoryId: unknown = Reflect.get(value, "categoryId") ?? null;
  if (categoryId !== null && (typeof categoryId !== "number" ||
    !Number.isInteger(categoryId) || categoryId < 1 || categoryId > 2147483647)) {
    throw new CardInputError("分类编号无效。");
  }
  if (kind !== "connect" && categoryId !== null) throw new CardInputError("Works 卡片不支持 Connect 分类。");
  return {
    kind, title: field("title", 200, true), username: field("username", 200),
    link, description: field("description", 10000), image, icon, categoryId,
  };
}

export function parseCategoryName(value: unknown): string {
  if (!value || typeof value !== "object" || !("name" in value) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 100) {
    throw new CardInputError("Category Name 不能为空且不能超过 100 个字符。");
  }
  return value.name.trim();
}

export function parseCategoryMutation(value: unknown): CategoryMutation {
  if (!value || typeof value !== "object") throw new CardInputError("分类操作无效。");
  if ("direction" in value) {
    if ("name" in value || (value.direction !== "up" && value.direction !== "down")) {
      throw new CardInputError("分类移动方向无效。");
    }
    return { direction: value.direction };
  }
  return { name: parseCategoryName(value) };
}

export function isCardKind(value: string): value is CardKind {
  return value === "connect" || value === "project" || value === "article";
}
