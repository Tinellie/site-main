"use client";

import { Box, CardMedia, Chip, Stack, Typography } from "@mui/material";

import { PageTemplate } from "@/components/layout/page-template";
import { EditPostFab } from "@/features/blog/edit-post-fab";
import { formatPostTimestamp } from "@/features/blog/format-timestamp";
import type { BlogPost } from "@/features/blog/types";
import { MarkdownPreview } from "@/features/editor/components/markdown-preview";

export function PostDetailPage({ post }: { post: BlogPost }) {
  return (
    <PageTemplate title={post.title} hideTitle maxWidth="md">
      <Stack id="post-detail" spacing={2}>
        {post.coverImage && (
          <CardMedia
            id="pd-image"
            component="img"
            image={post.coverImage}
            alt={post.title}
            sx={{ aspectRatio: "3", objectFit: "cover" }}
          />
        )}

        <Box sx={{ padding: 2 }}>
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {post.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>
            <Stack sx={{ ml: "auto", alignItems: "flex-end", textAlign: "right", color: "text.disabled" }}>
              <Typography
                id="pd-date"
                component="time"
                dateTime={post.publishedAt}
                variant="caption"
              >
                发布于 {formatPostTimestamp(post.publishedAt)}
              </Typography>
              {post.updatedAt && (
                <Typography
                  id="pd-updated-date"
                  component="time"
                  dateTime={post.updatedAt}
                  variant="caption"
                >
                  更新于 {formatPostTimestamp(post.updatedAt)}
                </Typography>
              )}
            </Stack>
          </Stack>
          <MarkdownPreview markdown={post.content} />
        </Box>
      </Stack>
      <EditPostFab id={post.id} />
    </PageTemplate>
  );
}