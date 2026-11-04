"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { SiteNav } from "@/components/navigation/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <SiteNav />
      <Container
        component="main"
        id="main-content"
        aria-label="博客内容"
        sx={{ flex: 1, py: { xs: 3, md: 5 } }}
      >
        {children}
      </Container>
    </Box>
  );
}