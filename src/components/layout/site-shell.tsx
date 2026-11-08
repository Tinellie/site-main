"use client";

import type { ReactNode } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { SiteNav, type NavItem } from "@/components/navigation/site-nav";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Connect", href: "/connect" },
  { label: "Works", href: "/works" },
  { label: "Blog", href: "/blog" },
  { label: "Gallery", href: "/gallery" },
] as const satisfies readonly NavItem[];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <Stack id="site-shell" sx={{ minHeight: "100dvh" }}>
      <SiteNav items={navigationItems} />
      <Box id="ss-page" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Stack>
  );
}