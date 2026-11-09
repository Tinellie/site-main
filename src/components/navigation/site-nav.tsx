"use client";

import NextLink from "next/link";

import {
  AppBar, Button, Container,
  Link, Stack, Toolbar, Typography,
} from "@mui/material";

import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteNavProps {
  items: readonly NavItem[];
}

export function SiteNav({ items }: SiteNavProps) {
  const pathname = usePathname();
  const midpoint = Math.floor(items.length / 2);

  function renderItems(group: readonly NavItem[]) {
    return group.map(({ label, href }) => (
      <Button
        key={href}
        className="sn-button"
        component={NextLink}
        href={href}
        size="small"
        color={pathname === href ? "primary" : "inherit"}
        aria-current={pathname === href ? "page" : undefined}
        sx={{ minWidth: 0 }}
      >
        {label}
      </Button>
    ));
  }

  return (
    <AppBar
      id="site-header"
      component="header"
      position="static"
      sx={{ position: "relative", flexShrink: 0 }}
    >
      <Container id="sn-container">
        <Toolbar
          id="sn-nav"
          component="nav"
          aria-label="主导航"
          disableGutters
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            gap: 1,
          }}
        >
          <Stack
            id="sn-left"
            direction="row"
            useFlexGap
            sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            {renderItems(items.slice(0, midpoint))}
          </Stack>

          <Typography
            id="sn-title"
            component="div"
            variant="h6"
            sx={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            <Link
              id="sn-home-link"
              component={NextLink}
              href="/"
              aria-label={`${siteConfig.title}首页`}
            >
              {siteConfig.title}
            </Link>
          </Typography>

          <Stack
            id="sn-right"
            direction="row"
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {renderItems(items.slice(midpoint))}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}