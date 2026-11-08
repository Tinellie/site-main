import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { debugPosts } from "@/features/blog/blog-page";
import { PostDetailPage } from "@/features/blog/post-detail-page";

export function generateStaticParams() {
  return debugPosts.map((post) => ({ id: post.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = debugPosts.find((item) => item.id === id);
  return { title: post?.title ?? "Post not found" };
}

export default async function Page({ params }: PageProps<"/blog/[id]">) {
  const { id } = await params;
  const post = debugPosts.find((item) => item.id === id);
  if (!post) notFound();
  return <PostDetailPage post={post} />;
}