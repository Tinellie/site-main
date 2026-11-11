"use client";

import { Box, Portal } from "@mui/material";

import { BackgroundMedia } from "@/components/layout/background-media";

export interface PageBackgroundProps {
  backgroundImage?: string;
  backgroundColor?: string;
  overlayColor?: string;
}

function getBackgroundContainer() {
  const shell = document.getElementById("site-shell");
  if (!shell) throw new Error("PageBackground must be used within SiteShell.");
  return shell;
}

export function PageBackground({
  backgroundImage,
  backgroundColor,
  overlayColor,
}: PageBackgroundProps) {
  return (
    <Portal container={getBackgroundContainer}>
      <Box
        className="page-background"
        aria-hidden="true"
        sx={{
          position: "fixed",
          isolation: "isolate",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          backgroundColor,
        }}
      >
        <BackgroundMedia backgroundImage={backgroundImage} overlayColor={overlayColor} />
      </Box>
    </Portal>
  );
}
