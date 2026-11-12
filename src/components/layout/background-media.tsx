"use client";

import Image from "next/image";
import { Box } from "@mui/material";

export function BackgroundMedia({
  backgroundImage,
  overlayColor,
}: {
  backgroundImage?: string;
  overlayColor?: string;
}) {
  return (
    <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none" }}>
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          unoptimized={!backgroundImage.startsWith("/") || backgroundImage.startsWith("//") || backgroundImage.startsWith("/api/")}
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      )}
      {overlayColor && <Box sx={{ position: "absolute", inset: 0, backgroundColor: overlayColor }} />}
    </Box>
  );
}
