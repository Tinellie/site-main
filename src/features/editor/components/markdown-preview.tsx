"use client";

import { useEffect, useRef } from "react";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

import Vditor from "vditor";
import "vditor/dist/index.css";

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.innerHTML = "";
    Vditor.preview(node, markdown, {
      mode: "light",
      theme: {
        current: theme.palette.mode === "dark" ? "dark" : "light",
      },
      markdown: { sanitize: true, linkBase: "/assets/" },
    });
  }, [markdown, theme.palette.mode]);

  return (
    <Box
      sx={{
        "& .vditor-reset": {
          fontFamily: "inherit",
        },
      }}
    >
      <div ref={containerRef} />
    </Box>
  );
}
