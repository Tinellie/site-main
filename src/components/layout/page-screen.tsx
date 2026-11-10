"use client";

import type { ReactNode } from "react";

import { Box, type SxProps, type Theme } from "@mui/material";

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
  const backgroundLayers = [
    overlayColor && `linear-gradient(${overlayColor}, ${overlayColor})`,
    backgroundImage && `url(${JSON.stringify(backgroundImage)})`,
  ].filter(Boolean).join(", ");

  return (
    <Box
      component="section"
      id={id}
      className="page-screen"
      aria-label={label}
      tabIndex={0}
      sx={[
        {
          height: "100dvh",
          minHeight: 0,
          boxSizing: "border-box",
          overflowY: "auto",
          overflowWrap: "anywhere",
          p: 3,
          backgroundColor,
          backgroundImage: backgroundLayers || undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
