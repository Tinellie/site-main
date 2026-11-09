import { PageTemplate } from "@/components/layout/page-template";
import { BlogExplorer } from "@/features/blog/blog-explorer";
import { CreatePostFab } from "@/features/blog/create-post-fab";
import type { BlogPostSummary } from "@/features/blog/types";

export function BlogPage({ posts }: { posts: readonly BlogPostSummary[] }) {
  return (
    <PageTemplate title="Blog">
      <BlogExplorer posts={posts} />
      <CreatePostFab />
    </PageTemplate>
  );
}