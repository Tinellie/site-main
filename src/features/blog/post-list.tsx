"use client";

import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";

import { PostCard } from "@/features/blog/post-card";
import type { BlogPost } from "@/features/blog/types";

export function PostList({ posts }: { posts: readonly BlogPost[] }) {
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