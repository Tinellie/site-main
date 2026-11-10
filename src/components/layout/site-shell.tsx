"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { alpha, Box } from "@mui/material";

import { SiteNav, type NavItem } from "@/components/navigation/site-nav";
import { PageScrollbar } from "@/components/layout/page-scrollbar";
import { AuthControls } from "@/features/auth/auth-controls";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Connect", href: "/connect" },
  { label: "Works", href: "/works" },
  { label: "Blog", href: "/blog" },
  { label: "Gallery", href: "/gallery" },
] as const satisfies readonly NavItem[];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const restoringHistory = useRef(false);

  useEffect(() => {
    function handlePopState() {
      restoringHistory.current = window.location.pathname !== pathname;
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const position = restoringHistory.current
      ? (scrollPositions.current.get(pathname) ?? 0)
      : 0;
    const restore = restoringHistory.current;
    restoringHistory.current = false;
    const frame = requestAnimationFrame(() => {
      if (restore || !window.location.hash) page.scrollTop = position;
    });

    const rememberPosition = () => {
      scrollPositions.current.set(pathname, page.scrollTop);
    };
    page.addEventListener("scroll", rememberPosition, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      page.removeEventListener("scroll", rememberPosition);
    };
  }, [pathname]);

  return (
    <Box
      id="site-shell"
      sx={(theme) => ({
        height: "100dvh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        "& > #site-header": { gridArea: "1 / 1 / 2 / 2" },
        "&:has(#main-content[data-ignore-nav='true']) > :is(#ss-page, #ss-scrollbar)": {
          gridArea: "1 / 1 / 3 / 2",
        },
        "&:has(#main-content[data-transparent-nav='true']) > #site-header": {
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
          backgroundImage: "none",
        },
      })}
    >
      <SiteNav items={navigationItems} />
      <Box
        id="ss-page"
        ref={pageRef}
        role="region"
        aria-label="正文滚动区域"
        tabIndex={0}
        sx={{
          gridArea: "2 / 1 / 3 / 2",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          containerType: "size",
        }}
      >
        {children}
        <Box
          component="footer"
          id="site-footer"
          sx={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-start",
            p: 2,
          }}
        >
          <AuthControls />
        </Box>
      </Box>
      <PageScrollbar scrollRef={pageRef} />
    </Box>
  );
}