"use client";

import CardMedia from "@mui/material/CardMedia";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { PageTemplate } from "@/components/layout/page-template";
import { resolveImagePath } from "@/lib/images/resolve-image-path";
import type { BlogPost } from "@/features/blog/types";

export function PostDetailPage({ post }: { post: BlogPost }) {
  return (
    <PageTemplate title={post.title}>
      <Stack id="post-detail" spacing={2}>
        <CardMedia
          id="pd-image"
          component="img"
          image={resolveImagePath(post.image)}
          alt={post.title}
          sx={{ maxHeight: 480, objectFit: "cover" }}
        />

        <Typography
          id="pd-date"
          component="time"
          dateTime={post.publishedAt}
          variant="body2"
          color="text.secondary"
        >
          {post.publishedAt}
        </Typography>
        <Typography id="pd-description">{post.description}</Typography>
        <Typography
          id="pd-debug-note"
          variant="body2"
          color="text.secondary"
        >
          测试详情页；正文及数据库读取尚未接入。
        </Typography>
      </Stack>
    </PageTemplate>
  );
}