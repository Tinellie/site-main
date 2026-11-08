"use client";

import { useState } from "react";

import Grid from "@mui/material/Grid";

import { PostList } from "@/features/blog/post-list";
import { BlogSidebar } from "@/features/blog/blog-sidebar";
import type { BlogPost, PostFilters } from "@/features/blog/types";

export function BlogExplorer({ posts }: { posts: readonly BlogPost[] }) {
  const [filters, setFilters] = useState<PostFilters>({
    search: "",
    dateFrom: "",
    dateTo: "",
    tags: [],
  });
  const tags = [...new Set(posts.flatMap((post) => [...post.tags]))].sort();
  const search = filters.search.trim().toLocaleLowerCase();
  const filteredPosts = posts.filter((post) => (
    (!search ||
      `${post.title} ${post.description}`.toLocaleLowerCase().includes(search)) &&
    (!filters.dateFrom || post.publishedAt >= filters.dateFrom) &&
    (!filters.dateTo || post.publishedAt <= filters.dateTo) &&
    (!filters.tags.length || post.tags.some((tag) => filters.tags.includes(tag)))
  ));

  return (
    <Grid
      id="blog-explorer"
      container
      spacing={3}
      sx={{ alignItems: "flex-start" }}
    >
      <Grid id="be-post-column" size={{ xs: 12, md: 8, lg: 9 }}>
        <PostList posts={filteredPosts} />
      </Grid>
      <Grid
        id="be-sidebar-column"
        size={{ xs: 12, md: 4, lg: 3 }}
        sx={{ alignSelf: "stretch" }}
      >
        <BlogSidebar
          filters={filters}
          tags={tags}
          recommendations={posts.slice(0, 4)}
          onFiltersChange={setFilters}
        />
      </Grid>
    </Grid>
  );
}