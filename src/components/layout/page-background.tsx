"use client";

import { Box, Portal } from "@mui/material";

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
  const backgroundLayers = [
    overlayColor && `linear-gradient(${overlayColor}, ${overlayColor})`,
    backgroundImage && `url(${JSON.stringify(backgroundImage)})`,
  ].filter(Boolean).join(", ");

  return (
    <Portal container={getBackgroundContainer}>
      <Box
        className="page-background"
        aria-hidden="true"
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          backgroundColor,
          backgroundImage: backgroundLayers || undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </Portal>
  );
}
