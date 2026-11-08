export const IMAGE_ROOT_PREFIX = "@images/";

/** Public URL indexing only; this is not a filesystem access API. */
export function resolveImagePath(
  path: string,
  directory: "assets" | "icons" = "assets",
): string {
  const fromRoot = path.startsWith(IMAGE_ROOT_PREFIX);
  if (directory === "icons" && fromRoot) {
    throw new Error("图标地址必须相对于 icons 目录。");
  }
  const relativePath = fromRoot ? path.slice(IMAGE_ROOT_PREFIX.length) : path;
  let decoded: string;

  try {
    decoded = decodeURIComponent(relativePath);
  } catch {
    throw new Error("图片路径包含无效编码。");
  }

  const segments = decoded.split("/");
  if (
    !decoded ||
    /[\\:%?#\u0000-\u001f]/.test(decoded) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("图片路径必须是储存目录内的相对路径，不允许访问上级目录。");
  }

  const base = fromRoot ? "/images" : `/images/${directory}`;
  return `${base}/${segments.map(encodeURIComponent).join("/")}`;
}