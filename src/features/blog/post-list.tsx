"use client";

import { Stack, Alert } from "@mui/material";

import { CardReveal, CardRevealGroup } from "@/components/cards/card-reveal";
import { PostCard } from "@/features/blog/post-card";
import type { BlogPostSummary } from "@/features/blog/types";

export function PostList({ posts }: { posts: readonly BlogPostSummary[] }) {
  return (
    <CardRevealGroup key={posts.map(post => `${post.id}:${post.coverImage}`).join("|")}>
    <Stack id="post-list" spacing={2}>
      {posts.length ? (
        posts.map((post) => (
          <CardReveal key={post.id}><PostCard post={post} /></CardReveal>
        ))
      ) : (
        <Alert id="pl-empty" severity="info">
          没有符合筛选条件的文章。
        </Alert>
      )}
    </Stack>
    </CardRevealGroup>
  );
}