"use client";

import { Stack, Alert } from "@mui/material";

import { PostCard } from "@/features/blog/post-card";
import type { BlogPostSummary } from "@/features/blog/types";

export function PostList({ posts }: { posts: readonly BlogPostSummary[] }) {
  return (
    <Stack id="post-list" spacing={2}>
      {posts.length ? (
        posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      ) : (
        <Alert id="pl-empty" severity="info">
          没有符合筛选条件的文章。
        </Alert>
      )}
    </Stack>
  );
}