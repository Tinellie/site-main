import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { getDb } from "@/db";
import { articleImageReferences, contentCards } from "@/db/schema";
import { assetReferencePath } from "@/features/gallery/asset-path";
import type { AssetUsage } from "@/features/gallery/types";
import { requireEditor } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/http";
import { getPostById, listPostSummaries } from "@/lib/blog/post-store";
import { validateImageUpload } from "@/lib/cards/assets";
import { withContentWriteLock } from "@/lib/content-write-lock";
import { recordPostImages } from "@/lib/images/reference-store";
import { existingAssetPath, inspectAssetPath, linkAssetWithoutOverwrite, validatedAssetPath } from "./file-paths";
import { availableAssetName } from "./available-name";
import { withAssetReferenceMoves } from "./reference-moves";

const samePath = (a: string | null, b: string) => a !== null && a.toLocaleLowerCase() === b.toLocaleLowerCase();
const referencePath = (value: string) => assetReferencePath(value, process.env.AUTH_ORIGIN);

async function currentPosts() {
  const summaries = await listPostSummaries();
  const posts = [];
  for (const summary of summaries) {
    const post = await getPostById(summary.id);
    if (!post) throw new Error("文章在引用扫描期间发生变化，请重试。");
    posts.push(post);
  }
  return posts;
}

async function scanReferences(relative: string) {
  const posts = await currentPosts();
  const db = getDb();
  // Backfill current Markdown files, including articles saved before reference tracking existed.
  await db.transaction(async tx => {
    await tx.delete(articleImageReferences);
    for (const post of posts) await recordPostImages(tx, post);
  });
  const [references, cards] = await Promise.all([
    db.select().from(articleImageReferences),
    db.select().from(contentCards),
  ]);
  const usage: AssetUsage = {
    connect: cards.some(card => card.kind === "connect" && samePath(referencePath(card.image), relative)),
    works: cards.some(card => card.kind !== "connect" && samePath(referencePath(card.image), relative)),
    articles: references.filter(item => samePath(item.assetPath, relative))
      .map(item => ({ id: item.postId, title: item.postTitle })),
  };
  return { usage, posts, cards };
}

export async function inspectManagedAsset(value: unknown, suggest = false) {
  await requireEditor();
  let relative = validatedAssetPath(value);
  if (suggest) {
    relative = validatedAssetPath(relative.split("/").at(-1));
    relative = await availableAssetName(relative, async name => (await inspectAssetPath(name, false, true)).exists);
  }
  const info = await inspectAssetPath(relative, false, true);
  return { path: relative, exists: info.exists, createsFolder: info.createsFolder };
}

export async function managedAssetUsage(value: unknown) {
  await requireEditor();
  const relative = validatedAssetPath(value);
  return withContentWriteLock(async () => {
    await existingAssetPath(relative);
    return (await scanReferences(relative)).usage;
  });
}

export async function uploadManagedAsset(file: File, value: unknown) {
  await requireEditor();
  const relative = validatedAssetPath(value);
  if (path.extname(relative).toLowerCase() !== path.extname(file.name).toLowerCase()) {
    throw new AuthError("Path 必须保留原图片扩展名。", 400);
  }
  const bytes = await validateImageUpload(file);
  return withContentWriteLock(async () => {
    const destination = await inspectAssetPath(relative, true);
    try { await fs.writeFile(destination.absolute, bytes, { flag: "wx" }); }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") throw new AuthError("Path 已存在同名文件。", 409);
      throw error;
    }
    return relative;
  });
}

export async function moveManagedAsset(source: unknown, target: unknown) {
  await requireEditor();
  const from = validatedAssetPath(source), to = validatedAssetPath(target);
  if (path.extname(from).toLowerCase() !== path.extname(to).toLowerCase()) {
    throw new AuthError("Path 必须保留原文件扩展名。", 400);
  }
  return withContentWriteLock(async () => {
    const sourcePath = await existingAssetPath(from);
    if (from === to) return to;
    if (from.toLowerCase() === to.toLowerCase()) throw new AuthError("请使用与原路径不同的名称。", 400);
    const targetInfo = await inspectAssetPath(to, true);
    await linkAssetWithoutOverwrite(sourcePath, targetInfo.absolute);
    try {
      await withAssetReferenceMoves(new Map([[from, to]]), () => fs.unlink(sourcePath));
    } catch (error) {
      // Compensate filesystem writes if the database transaction or a write fails.
      try {
        const sourceInfo = await inspectAssetPath(from);
        if (!sourceInfo.exists) await fs.link(targetInfo.absolute, sourcePath);
        await fs.unlink(targetInfo.absolute);
      } catch (rollbackError) {
        console.error("Asset move rollback failed:", rollbackError);
        throw new Error("文件操作及回滚失败，请检查文件与数据库状态。", { cause: error });
      }
      throw error;
    }
    return to;
  });
}

export async function deleteManagedAsset(value: unknown, confirmReferences: boolean) {
  await requireEditor();
  const relative = validatedAssetPath(value);
  return withContentWriteLock(async () => {
    const file = await existingAssetPath(relative);
    const { usage } = await scanReferences(relative);
    if (!confirmReferences && (usage.connect || usage.works || usage.articles.length)) return { deleted: false, usage };
    await fs.unlink(file);
    return { deleted: true, usage };
  });
}
