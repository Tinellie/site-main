"use client";

import {
  Avatar,
  Card, CardContent,
  Stack, Typography,
} from "@mui/material";

import { Language } from "@mui/icons-material";

import { CardLinkAction } from "@/components/cards/card-link-action";
import { resolveCardImagePath } from "@/features/cards/image-path";

export interface SocialLinkCardProps {
  image?: string;
  iconName?: string;

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
  return (
    <Card
      className="social-link-card"
      sx={{
        borderRadius: 2,
        m: 1,
        height: 140,
      }}
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
              src={image ? resolveCardImagePath(image) : `/api/icons/${iconName || "Language"}`}
              alt={platform}
              sx={{ width: 56, height: 56 }}
            >
              <Language fontSize="large" />
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