"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { resolveImagePath } from "@/lib/images/resolve-image-path";
import type { BlogPost } from "@/features/blog/types";

export function PostCard({
  post,
  compact = false,
}: {
  post: BlogPost;
  compact?: boolean;
}) {
  return (
    <Card
      className={compact ? "post-card poc-compact" : "post-card"}
      variant="outlined"
    >
      <CardLinkAction
        href={`/blog/${encodeURIComponent(post.id)}`}
        className="poc-action"
        sx={
          compact
            ? {
                display: "flex",
                alignItems: "stretch",
                justifyContent: "flex-start",
              }
            : undefined
        }
      >
        <CardMedia
          className="poc-image"
          component="img"
          image={resolveImagePath(post.image)}
          alt={post.title}
          loading="lazy"
          sx={
            compact
              ? { width: 88, flexShrink: 0, alignSelf: "stretch" }
              : { height: 224 }
          }
        />

        <CardContent className="poc-content" sx={{ minWidth: 0, flex: 1 }}>
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
            noWrap={compact}
            title={post.description}
          >
            {post.description}
          </Typography>
          {!compact && (
            <Typography
              className="poc-date"
              component="time"
              dateTime={post.publishedAt}
              variant="caption"
              color="text.secondary"
            >
              {post.publishedAt}
            </Typography>
          )}
        </CardContent>
      </CardLinkAction>
    </Card>
  );
}