"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { resolveImagePath } from "@/lib/images/resolve-image-path";
import type { WorkCardProps } from "@/features/works/types";

export function ProjectCard({
  image,
  title,
  description,
  href,
}: WorkCardProps) {
  return (
    <Card className="project-card" variant="outlined" sx={{ height: 320 }}>
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
        <CardMedia
          className="prc-image"
          component="img"
          image={resolveImagePath(image)}
          alt={title}
          sx={{ height: 176, flexShrink: 0 }}
        />

        <CardContent className="prc-content" sx={{ minWidth: 0 }}>
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
            }}
          >
            {description}
          </Typography>
        </CardContent>
      </CardLinkAction>
    </Card>
  );
}