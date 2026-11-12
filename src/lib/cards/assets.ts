import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { requireEditor } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/http";
import { resolveImagePath } from "@/lib/images/resolve-image-path";
import { validateSvg } from "@/lib/images/svg";

const root = path.join(process.cwd(), "public", "assets");
export const MAX_CARD_IMAGE_BYTES = 10 * 1024 * 1024;
const extensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
const contentTypes: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

function relativePath(value: string) {
  try { resolveImagePath(value); } catch {
    throw new AuthError("图片路径必须是 assets 下的相对路径。", 400);
  }
  if (value.startsWith("@images/") || !extensions.has(path.extname(value).toLowerCase())) {
    throw new AuthError("图片仅支持 PNG、JPEG、GIF、WebP、AVIF、SVG。", 400);
  }
  return decodeURIComponent(value);
}

async function safePath(relative: string, createParents: boolean) {
  if (createParents) await fs.mkdir(root, { recursive: true });
  const rootStat = await fs.lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new AuthError("assets 目录无效。", 400);
  const parts = relative.split("/");
  for (let index = 1; index < parts.length; index++) {
    const directory = path.join(process.cwd(), "public", "assets", ...parts.slice(0, index));
    if (createParents) {
      try { await fs.mkdir(directory); } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") throw error;
      }
    }
    const stat = await fs.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new AuthError("不允许使用符号链接目录。", 400);
  }
  return path.join(process.cwd(), "public", "assets", relative);
}

export async function readCardImage(image: string) {
  const relative = relativePath(image);
  const source = await safePath(relative, false);
  const stat = await fs.lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new AuthError("图片不是普通文件。", 400);
  return { bytes: await fs.readFile(source), contentType: contentTypes[path.extname(relative).toLowerCase()] };
}

export async function uploadCardImage(file: File) {
  await requireEditor();
  const bytes = await validateImageUpload(file);
  const extension = path.extname(file.name).toLowerCase();
  const name = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120) || "image";
  const image = relativePath(`${name}-${randomUUID()}${extension}`);
  const destination = await safePath(image, true);
  await fs.writeFile(destination, bytes, { flag: "wx" });
  return image;
}

export async function validateImageUpload(file: File) {
  if (file.size < 1 || file.size > MAX_CARD_IMAGE_BYTES || !file.type.startsWith("image/")) {
    throw new AuthError("请选择不超过 10MB 的图片。", 400);
  }
  const extension = path.extname(file.name).toLowerCase();
  if (!extensions.has(extension)) throw new AuthError("不支持此图片格式。", 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (extension === ".svg") {
    try { validateSvg(bytes); } catch {
      throw new AuthError("SVG 格式无效，或包含脚本、外部引用等不支持的内容。", 400);
    }
    return bytes;
  }
  const signature = bytes.subarray(0, 32).toString("latin1");
  const valid = extension === ".png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : extension === ".jpg" || extension === ".jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : extension === ".gif" ? /^GIF8[79]a/.test(signature)
    : extension === ".webp" ? signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP"
    : signature.slice(4, 8) === "ftyp" && /avif|avis/.test(signature.slice(8));
  if (!valid) throw new AuthError("图片内容与文件格式不符。", 400);
  return bytes;
}

export async function moveCardImage(source: string, target: string) {
  const { moveManagedAsset } = await import("@/lib/gallery/file-manager");
  return moveManagedAsset(relativePath(source), relativePath(target));
}
