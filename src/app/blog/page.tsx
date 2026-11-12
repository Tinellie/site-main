import type { Metadata } from "next";

import { BlogPage } from "@/features/blog/blog-page";
import { listPostSummaries } from "@/lib/blog/post-store";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const posts = await listPostSummaries();
  return <BlogPage posts={posts} />;
}