import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostDetailPage } from "@/features/blog/post-detail-page";
import { getPostById } from "@/lib/blog/post-store";

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[id]">): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return { title: "Post not found" };
  const post = await getPostById(id);
  return { title: post?.title ?? "Post not found" };
}

export default async function Page({ params }: PageProps<"/blog/[id]">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();
  const post = await getPostById(id);
  if (!post) notFound();
  return <PostDetailPage post={post} />;
}