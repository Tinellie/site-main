"use client";

import { Card, CardContent, CardMedia, Typography } from "@mui/material";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { formatPostTimestamp } from "@/features/blog/format-timestamp";
import type { BlogPostSummary } from "@/features/blog/types";

export function PostCard({
  post,
  compact = false,
}: {
  post: BlogPostSummary;
  compact?: boolean;
}) {
  return (
    <Card
      className={compact ? "post-card poc-compact" : "post-card"}
      sx={compact ? { height: 88 } : undefined}
    >
      <CardLinkAction
        href={`/blog/${post.id}`}
        className="poc-action"
        sx={
          compact
            ? {
                display: "flex",
                height: "100%",
                alignItems: "stretch",
                justifyContent: "flex-start",
              }
            : undefined
        }
      >
        {post.coverImage && (
          <CardMedia
            className="poc-image"
            component="img"
            image={post.coverImage}
            alt={post.title}
            loading="eager"
            decoding="async"
            sx={
              compact
                ? {
                    width: 88,
                    height: "100%",
                    flexShrink: 0,
                    objectFit: "cover",
                    objectPosition: "center",
                  }
                : { aspectRatio: "3", objectFit: "cover" }
            }
          />
        )}

        <CardContent
          className="poc-content"
          sx={{
            width: "100%",
            minWidth: 0,
            flex: 1,
            ...(compact && {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }),
          }}
        >
          <Typography
            className="poc-title"
            component={compact ? "h3" : "h2"}
            variant={compact ? "subtitle2" : "h6"}
            sx={{ fontWeight: "bold" }}
            noWrap={compact}
            title={post.title}
          >
            {post.title}
          </Typography>
          <Typography
            className="poc-description"
            variant="body2"
            color="text.secondary"
            noWrap
            title={post.summary}
          >
            {post.summary}
          </Typography>
          {!compact && (
            <Typography
              className="poc-date"
              component="time"
              dateTime={post.publishedAt}
              variant="caption"
              color="text.secondary"
            >
              {formatPostTimestamp(post.publishedAt)}
            </Typography>
          )}
        </CardContent>
      </CardLinkAction>
    </Card>
  );
}