"use client";

import {
  alpha, Avatar,
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
      sx={(theme) => ({
        borderRadius: 2,
        m: 1,
        height: 140,
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        backgroundImage: "none",
        border: "1px solid",
        borderColor: alpha(theme.palette.common.white, 0.15),
        "@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))": {
          backgroundColor: alpha(theme.palette.background.paper, 0.45),
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
        },
      })}
    >
      <CardLinkAction
        href={href}
        className="slc-action"
        sx={{
          p: 2,
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <CardContent className="slc-content" sx={{ p: 2, width: "100%" }}>
          <Stack
            className="slc-identity"
            direction="row"
            spacing={2}
            sx={{ alignItems: "center" }}
          >
            <Avatar
              className="slc-icon"
              src={image ? resolveImagePath(image, "icons") : undefined}
              alt={platform}
              sx={{ width: 56, height: 56 }}
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