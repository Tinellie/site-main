"use client";

import type { ReactNode } from "react";

import { Box, type SxProps, type Theme } from "@mui/material";

import { BackgroundMedia } from "@/components/layout/background-media";

export interface PageScreenProps {
  id?: string;
  label?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  overlayColor?: string;
  children?: ReactNode;
  sx?: SxProps<Theme>;
}

export function PageScreen({
  id,
  label,
  backgroundImage,
  backgroundColor,
  overlayColor,
  children,
  sx = [],
}: PageScreenProps) {
  return (
    <Box
      component="section"
      id={id}
      className="page-screen"
      aria-label={label}
      tabIndex={0}
      sx={[
        {
          position: "relative",
          isolation: "isolate",
          height: "100dvh",
          minHeight: 0,
          boxSizing: "border-box",
          overflowY: "auto",
          overflowWrap: "anywhere",
          p: 3,
          backgroundColor,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <BackgroundMedia backgroundImage={backgroundImage} overlayColor={overlayColor} />
      {children}
    </Box>
  );
}
