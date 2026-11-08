import { PageTemplate } from "@/components/layout/page-template";
import { BlogExplorer } from "@/features/blog/blog-explorer";
import type { BlogPost } from "@/features/blog/types";

export function BlogPage() {
  return (
    <PageTemplate title="Blog">
      <BlogExplorer posts={debugPosts} />
    </PageTemplate>
  );
}

// Temporary page-local fixtures, also used by the debug detail route.
export const debugPosts = [
  {
    id: "first-post",
    image: "DSC01748.JPG",
    title: "Building a Personal Blog",
    description:
      "Getting started with Next.js and MUI: a small website with reusable pages and cards.",
    publishedAt: "2026-11-08",
    tags: ["Next.js", "MUI"],
  },
  {
    id: "interface-notes",
    image: "proj.png",
    title: "Interface Notes",
    description:
      "Experiments with responsive layouts, typography, and accessible interactions.",
    publishedAt: "2026-11-05",
    tags: ["MUI", "Design"],
  },
  {
    id: "project-journal",
    image: "@images/assets/proj2.png",
    title: "Project Journal",
    description: "A short progress report from the component playground.",
    publishedAt: "2026-10-28",
    tags: ["Projects", "Next.js"],
  },
  {
    id: "visual-study",
    image: "model.jpg",
    title: "Visual Study",
    description:
      "A collection of observations about composition and visual design.",
    publishedAt: "2026-10-20",
    tags: ["Design", "Photography"],
  },
  {
    id: "photo-notes",
    image: "model2.jpg",
    title: "Photography Notes",
    description: "Finding inspiration in small details and everyday scenes.",
    publishedAt: "2026-09-12",
    tags: ["Photography"],
  },
  {
    id: "component-library",
    image: "proj2.png",
    title: "A Small Component Library",
    description:
      "Keeping shared components simple, consistent, and easy to maintain.",
    publishedAt: "2026-08-10",
    tags: ["MUI", "Projects"],
  },
] as const satisfies readonly BlogPost[];