import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { articleImageReferences } from "@/db/schema";
import { assetReferencePath } from "@/features/gallery/asset-path";
import { markdownImages, unescapeImageUrl } from "@/lib/images/markdown-images";

export interface ReferencedPost { id: number; title: string; coverImage: string; content: string }
type ReferenceDb = Pick<ReturnType<typeof getDb>, "delete" | "insert">;

export function postImagePaths(post: ReferencedPost): string[] {
  const urls = [post.coverImage, ...markdownImages(post.content).map(image => unescapeImageUrl(image.url))];
  const paths = urls.filter(Boolean).map(url => assetReferencePath(url, process.env.AUTH_ORIGIN))
    .filter((value): value is string => value !== null);
  return [...new Map(paths.map(value => [value.toLowerCase(), value])).values()];
}

export async function recordPostImages(db: ReferenceDb, post: ReferencedPost) {
  await db.delete(articleImageReferences).where(eq(articleImageReferences.postId, post.id));
  const paths = postImagePaths(post);
  if (paths.length) await db.insert(articleImageReferences).values(paths.map(assetPath => ({
    postId: post.id, postTitle: post.title, assetPath,
    pathHash: createHash("sha256").update(assetPath.toLocaleLowerCase()).digest("hex"),
  })));
}
