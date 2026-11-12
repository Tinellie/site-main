export function parseAssetPath(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 1024) throw new Error("Path 无效。");
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { throw new Error("Path 编码无效。"); }
  const parts = decoded.split("/");
  if (parts.some(part => !part || part === "." || part === ".." ||
    part.startsWith(".gallery-operation-") || part.startsWith(".asset-replace-") ||
    /[\\:%?#\u0000-\u001f:*?"<>|]/.test(part) || /[. ]$/.test(part) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error("Path 必须是 assets 内的相对文件路径。");
  }
  return decoded;
}

export function assetUrl(relative: string): string {
  return `/assets/${relative.split("/").map(encodeURIComponent).join("/")}`;
}

export function assetReferencePath(value: string, origin?: string): string | null {
  let pathname = value.trim().replace(/&amp;/g, "&");
  if (/^https?:\/\//i.test(pathname) || pathname.startsWith("//")) {
    if (!origin) return null;
    try {
      const url = new URL(pathname, origin);
      if (url.origin !== new URL(origin).origin) return null;
      pathname = url.pathname;
    } catch { return null; }
  }
  pathname = pathname.split(/[?#]/, 1)[0];
  for (const prefix of ["/assets/", "/images/assets/", "/api/cards/assets/", "/api/gallery/assets/", "@images/assets/", "assets/"]) {
    if (pathname.startsWith(prefix)) { pathname = pathname.slice(prefix.length); break; }
  }
  if (pathname.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(pathname)) return null;
  try {
    const url = new URL(pathname, "https://assets.invalid/assets/");
    if (url.origin !== "https://assets.invalid" || !url.pathname.startsWith("/assets/")) return null;
    return parseAssetPath(url.pathname.slice("/assets/".length));
  } catch { return null; }
}
