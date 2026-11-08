"use client";

import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { PageTemplate } from "@/components/layout/page-template";
import { EditPostFab } from "@/features/blog/edit-post-fab";
import type { BlogPost } from "@/features/blog/types";
import { MarkdownPreview } from "@/features/editor/components/markdown-preview";

export function PostDetailPage({ post }: { post: BlogPost }) {
  return (
    <PageTemplate title={post.title}>
      <Stack id="post-detail" spacing={2}>
        {post.coverImage && (
          <CardMedia
            id="pd-image"
            component="img"
            image={post.coverImage}
            alt={post.title}
            sx={{ maxHeight: 480, objectFit: "cover" }}
          />
        )}

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {post.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>

        <Typography id="pd-date" component="time" dateTime={post.publishedAt} variant="body2" color="text.secondary">
          发布于 {post.publishedAt}
        </Typography>
        {post.updatedAt && (
          <Typography
            id="pd-updated-date"
            component="time"
            dateTime={post.updatedAt}
            variant="body2"
            color="text.secondary"
          >
            更新于 {post.updatedAt}
          </Typography>
        )}

        <Typography id="pd-description" color="text.secondary">
          {post.summary}
        </Typography>

        <MarkdownPreview markdown={post.content} />

        <Typography
          id="pd-debug-note"
          variant="body2"
          color="text.secondary"
        >
          文章内容基于 Markdown 渲染。
        </Typography>
      </Stack>
      <EditPostFab id={post.id} />
    </PageTemplate>
  );
}