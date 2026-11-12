"use client";

import { Stack, Typography } from "@mui/material";

import { CardReveal, CardRevealGroup } from "@/components/cards/card-reveal";
import { PostCard } from "@/features/blog/post-card";
import type { BlogPostSummary } from "@/features/blog/types";

export function RecommendedPostList({ posts }: { posts: readonly BlogPostSummary[] }) {
  return (
    <CardRevealGroup key={posts.map(post => `${post.id}:${post.coverImage}`).join("|")}>
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
        <CardReveal key={post.id}><PostCard post={post} compact /></CardReveal>
      ))}
    </Stack>
    </CardRevealGroup>
  );
}