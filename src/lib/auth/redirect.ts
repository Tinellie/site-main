export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)) return "/blog";
  const url = new URL(value, "https://local.invalid");
  return url.origin === "https://local.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/blog";
}
