"use client";

import { Card, CardContent, CardMedia, Typography } from "@mui/material";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { resolveCardImagePath } from "@/features/cards/image-path";
import type { WorkCardProps } from "@/features/works/types";

export function ProjectCard({
  image,
  title,
  description,
  href,
}: WorkCardProps) {
  return (
    <Card className="project-card" sx={{ height: 320 }}>
      <CardLinkAction
        href={href}
        className="prc-action"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "flex-start",
        }}
      >
        {image && <CardMedia
          className="prc-image"
          component="img"
          loading="lazy"
          decoding="async"
          image={resolveCardImagePath(image)}
          alt={title}
          sx={{ height: 176, flexShrink: 0 }}
        />}

        <CardContent
          className="prc-content"
          sx={{ width: "100%", minWidth: 0, minHeight: 0, overflow: "hidden" }}
        >
          <Typography
            className="prc-title"
            component="h3"
            variant="subtitle1"
            sx={{ fontWeight: "bold" }}
            noWrap
            title={title}
          >
            {title}
          </Typography>
          <Typography
            className="prc-description"
            variant="body2"
            color="text.secondary"
            title={description}
            sx={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {description}
          </Typography>
        </CardContent>
      </CardLinkAction>
    </Card>
  );
}