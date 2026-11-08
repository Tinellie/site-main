"use client";

import Stack from "@mui/material/Stack";

import { PostFilterPanel } from "@/features/blog/post-filter-panel";
import { RecommendedPostList } from "@/features/blog/recommended-post-list";
import type { BlogPostSummary, PostFilters } from "@/features/blog/types";

export interface BlogSidebarProps {
  filters: PostFilters;
  tags: readonly string[];
  recommendations: readonly BlogPostSummary[];
  onFiltersChange: (filters: PostFilters) => void;
}

export function BlogSidebar({
  filters,
  tags,
  recommendations,
  onFiltersChange,
}: BlogSidebarProps) {
  return (
    <Stack
      id="blog-sidebar"
      component="aside"
      aria-label="文章筛选与推荐"
      tabIndex={0}
      spacing={3}
      sx={{
        position: "sticky",
        top: (theme) => theme.spacing(2),
        maxHeight: (theme) => `calc(100dvh - ${theme.spacing(4)})`,
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
    >
      <PostFilterPanel
        filters={filters}
        availableTags={tags}
        onChange={onFiltersChange}
      />
      <RecommendedPostList posts={recommendations} />
    </Stack>
  );
}