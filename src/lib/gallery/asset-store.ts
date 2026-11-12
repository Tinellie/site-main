import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { AssetEntry } from "@/features/gallery/types";
import { assetKind } from "@/features/gallery/asset-kind";

export { assetKind } from "@/features/gallery/asset-kind";

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR");
}

export async function listAssets(segments: string[]): Promise<AssetEntry[] | null> {
  if (segments.some(segment =>
    !segment || segment === "." || segment === ".." ||
    /[\\/\u0000-\u001f:]/.test(segment)
  )) return null;

  const root = path.join(process.cwd(), "public", "assets");
  let directory = root;
  // Do not follow symlinks, including intermediate directory segments.
  try {
    for (const segment of segments) {
      directory = path.join(/* turbopackIgnore: true */ directory, segment);
      const stat = await fs.lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return null;
    }
    const entries = await fs.readdir(/* turbopackIgnore: true */ directory, { withFileTypes: true });
    return await Promise.all(entries
      .filter(entry => !entry.name.startsWith(".asset-replace-") && (entry.isDirectory() || entry.isFile()))
      .map(async entry => {
        const stat = await fs.lstat(path.join(/* turbopackIgnore: true */ directory, entry.name));
        const parts = [...segments, entry.name].map(encodeURIComponent).join("/");
        return {
          name: entry.name,
          kind: entry.isDirectory() ? "folder" : assetKind(entry.name),
          url: entry.isDirectory() ? `/gallery/${parts}` : `/assets/${parts}`,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        } satisfies AssetEntry;
      }));
  } catch (error) {
    if (missing(error)) return segments.length ? null : [];
    throw error;
  }
}
