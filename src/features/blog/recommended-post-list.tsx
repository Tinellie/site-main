"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { PostCard } from "@/features/blog/post-card";
import type { BlogPostSummary } from "@/features/blog/types";

export function RecommendedPostList({ posts }: { posts: readonly BlogPostSummary[] }) {
  return (
    <Stack
      id="recommended-post-list"
      component="section"
      aria-labelledby="rpl-title"
      spacing={2}
    >
      <Typography id="rpl-title" component="h2" variant="h6">
        Recommended
      </Typography>
      {posts.slice(0, 4).map((post) => (
        <PostCard key={post.id} post={post} compact />
      ))}
    </Stack>
  );
}