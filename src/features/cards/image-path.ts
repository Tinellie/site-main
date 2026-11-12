import { resolveImagePath } from "@/lib/images/resolve-image-path";

export function resolveCardImagePath(image: string) {
  const url = resolveImagePath(image);
  if (!url.startsWith("/assets/")) throw new Error("卡片图片必须使用 assets 下的相对路径。");
  return `/api/cards/assets/${url.slice("/assets/".length)}`;
}
