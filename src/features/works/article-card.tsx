"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { resolveImagePath } from "@/lib/images/resolve-image-path";
import type { WorkCardProps } from "@/features/works/types";

export function ArticleCard({
  image,
  title,
  description,
  href,
}: WorkCardProps) {
  return (
    <Card
      className="article-card"
      variant="outlined"
      sx={{ position: "relative" }}
    >
      <CardMedia
        className="ac-background"
        component="img"
        image={resolveImagePath(image)}
        alt=""
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",

          opacity: 0.15,
          pointerEvents: "none",
        }}
      />

      <CardLinkAction href={href} className="ac-action">
        <CardContent className="ac-content">
          <Typography
            className="ac-title"
            component="h3"
            variant="subtitle1"
            sx={{ fontWeight: "bold" }}
            noWrap
            title={title}
          >
            {title}
          </Typography>
          <Typography
            className="ac-description"
            variant="body2"
            color="text.secondary"
            noWrap
            title={description}
          >
            {description}
          </Typography>
        </CardContent>
      </CardLinkAction>
    </Card>
  );
}