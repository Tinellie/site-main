"use client";

import NextLink from "next/link";
import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { siteConfig } from "@/config/site";

export function SiteNav() {
  return (
    <AppBar component="header" position="static">
      <Container>
        <Toolbar
          component="nav"
          aria-label="主导航"
          disableGutters
          sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr" }}
        >
          <Typography component="h1" variant="h6" sx={{ gridColumn: 2 }}>
            <Link
              component={NextLink}
              href="/"
              aria-label={`${siteConfig.title}首页`}
              sx={{
                display: "inline-block",
                py: 1,
                px: 2,
                borderRadius: 1,
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              {siteConfig.title}
            </Link>
          </Typography>
        </Toolbar>
      </Container>
    </AppBar>
  );
}