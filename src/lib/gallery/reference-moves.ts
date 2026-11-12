import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contentCards } from "@/db/schema";
import { assetReferencePath, assetUrl } from "@/features/gallery/asset-path";
import type { AssetUsage } from "@/features/gallery/types";
import { getPostById, listPostSummaries } from "@/lib/blog/post-store";
import { postImagePaths, recordPostImages } from "@/lib/images/reference-store";
import { rewriteMarkdownImages, unescapeImageUrl } from "@/lib/images/markdown-images";

const reference = (url: string) => assetReferencePath(url, process.env.AUTH_ORIGIN)?.toLowerCase();

async function referenceSnapshot() {
  const posts = [];
  for (const summary of await listPostSummaries()) {
    const post = await getPostById(summary.id);
    if (!post) throw new Error("文章在文件操作期间发生变化，请重试。");
    posts.push(post);
  }
  return { posts, cards: await getDb().select().from(contentCards) };
}

export async function affectedAssetUsage(paths: string[]): Promise<AssetUsage> {
  if (!paths.length) return { connect: false, works: false, articles: [] };
  const targets = new Set(paths.map(value => value.toLowerCase()));
  const { posts, cards } = await referenceSnapshot();
  const uses = (url: string) => targets.has(reference(url) ?? "");
  return {
    connect: cards.some(card => card.kind === "connect" && uses(card.image)),
    works: cards.some(card => card.kind !== "connect" && uses(card.image)),
    articles: posts.filter(post => postImagePaths(post).some(value => targets.has(value.toLowerCase())))
      .map(post => ({ id: post.id, title: post.title })),
  };
}

// The caller holds the content write lock and compensates filesystem mutations on failure.
export async function withAssetReferenceMoves(moves: Map<string, string>, mutate: () => Promise<void>) {
  if (!moves.size) { await mutate(); return; }
  const mapping = new Map([...moves].map(([from, to]) => [from.toLowerCase(), to]));
  const { posts, cards } = await referenceSnapshot();
  const backups: { file: string; source: string }[] = [];
  const histories: string[] = [];
  const replacement = (url: string) => {
    const target = mapping.get(reference(url) ?? "");
    return target ? assetUrl(target) + (url.match(/[?#].*$/)?.[0] ?? "") : null;
  };
  try {
    await getDb().transaction(async tx => {
      for (const card of cards) {
        const target = mapping.get(reference(card.image) ?? "");
        if (target) await tx.update(contentCards).set({ image: target }).where(eq(contentCards.id, card.id));
      }
      for (const post of posts) {
        if (!postImagePaths(post).some(value => mapping.has(value.toLowerCase()))) continue;
        const file = path.join(process.cwd(), "content", "blog", `${post.id}.md`);
        const original = await fs.readFile(file, "utf8");
        const content = rewriteMarkdownImages(post.content, url => replacement(unescapeImageUrl(url)));
        const coverImage = replacement(post.coverImage) ?? post.coverImage;
        const updatedAt = new Date().toISOString();
        const history = path.join(process.cwd(), "content", "blog", "history", String(post.id));
        await fs.mkdir(history, { recursive: true });
        const version = path.join(history, `${updatedAt.replaceAll(":", "-")}-${randomUUID()}.md`);
        await fs.writeFile(version, original, { flag: "wx" });
        histories.push(version);
        backups.push({ file, source: original });
        await recordPostImages(tx, { ...post, content, coverImage });
        await fs.writeFile(file, matter.stringify(content, { ...matter(original).data, coverImage, updatedAt }), "utf8");
      }
      await mutate();
    });
  } catch (error) {
    try {
      for (const backup of backups) await fs.writeFile(backup.file, backup.source, "utf8");
      for (const history of histories) await fs.unlink(history);
    } catch (rollbackError) {
      console.error("Article reference rollback failed:", rollbackError);
      throw new Error("文章引用回滚失败，请检查文章及数据库状态。", { cause: error });
    }
    throw error;
  }
}
