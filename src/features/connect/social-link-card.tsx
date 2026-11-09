"use client";

import {
  Avatar,
  Card, CardContent,
  Stack, Typography,
} from "@mui/material";

import {
  Email, Language,
  GitHub, Instagram, LinkedIn, YouTube,
} from "@mui/icons-material";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { resolveImagePath } from "@/lib/images/resolve-image-path";

const socialIcons = { Email, GitHub, Instagram, Language, LinkedIn, YouTube };

export interface SocialLinkCardProps {
  image?: string;
  iconName?: keyof typeof socialIcons;

  platform: string;
  socialId: string;
  href: string;
}

export function SocialLinkCard({
  image,
  iconName,
  platform,
  socialId,
  href,
}: SocialLinkCardProps) {
  const Icon = iconName ? socialIcons[iconName] : Language;

  return (
    <Card
      className="social-link-card"
      variant="outlined"
      sx={{ minHeight: 180, height: "100%" }}
    >
      <CardLinkAction
        href={href}
        className="slc-action"
        sx={{
          minHeight: "inherit",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <CardContent className="slc-content" sx={{ p: 3, width: "100%" }}>
          <Stack
            className="slc-identity"
            direction="row"
            spacing={3}
            sx={{ alignItems: "center" }}
          >
            <Avatar
              className="slc-icon"
              src={image ? resolveImagePath(image, "icons") : undefined}
              alt={platform}
              sx={{ width: 64, height: 64 }}
            >
              {image ? null : <Icon fontSize="large" />}
            </Avatar>

            <Stack className="slc-text" sx={{ minWidth: 0 }}>
              <Typography
                className="slc-platform"
                component="h3"
                variant="h6"
                sx={{ fontWeight: "bold" }}
              >
                {platform}
              </Typography>
              <Typography
                className="slc-id"
                variant="body2"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                {socialId}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </CardLinkAction>
    </Card>
  );
}