import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { AuthError } from "@/lib/auth/http";
import { parseAssetPath } from "@/features/gallery/asset-path";

export const assetRoot = path.join(process.cwd(), "public", "assets");

export function validatedAssetPath(value: unknown): string {
  try { return parseAssetPath(value); }
  catch (error) { throw new AuthError(error instanceof Error ? error.message : "Path 无效。", 400); }
}

export function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function inspectAssetPath(relative: string, createParents = false, allowOccupiedName = false) {
  const parts = validatedAssetPath(relative).split("/");
  if (createParents) await fs.mkdir(assetRoot, { recursive: true });
  let directory = assetRoot;
  let missing = false;
  for (const part of ["", ...parts.slice(0, -1)]) {
    if (part) directory = path.join(/* turbopackIgnore: true */ directory, part);
    try {
      const stat = await fs.lstat(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new AuthError("Path 不允许符号链接或非目录节点。", 400);
    } catch (error) {
      if (!isMissingFile(error)) throw error;
      missing = true;
      if (createParents) await fs.mkdir(directory);
    }
  }
  const absolute = path.join(assetRoot, ...parts);
  let exists = false;
  try {
    const stat = await fs.lstat(absolute);
    if (!allowOccupiedName && (stat.isSymbolicLink() || !stat.isFile())) throw new AuthError("Path 必须指向普通文件。", 400);
    exists = true;
  } catch (error) { if (!isMissingFile(error)) throw error; }
  return { absolute, exists, createsFolder: missing };
}

export async function existingAssetPath(relative: string) {
  const result = await inspectAssetPath(relative);
  if (!result.exists) throw new AuthError("文件不存在或已被移动。", 404);
  return result.absolute;
}

export async function linkAssetWithoutOverwrite(source: string, target: string) {
  try { await fs.link(source, target); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new AuthError("Path 已存在同名文件。", 409);
    }
    throw error;
  }
}
