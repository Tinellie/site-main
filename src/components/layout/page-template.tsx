"use client";

import type { ReactNode } from "react";

import { Box, Container, Typography, type ContainerProps } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

export interface PageTemplateProps {
  title?: string;
  hideTitle?: boolean;
  hideScrollbar?: boolean;
  children?: ReactNode;
  removeMargin?: boolean;
  ignoreNav?: boolean;
  transparentNav?: boolean;
  paginated?: boolean;
  maxWidth?: ContainerProps["maxWidth"] | number;
}

const pageLayout = {
  minimumContentWidth: 320,
  gutter: 3,
  horizontalGutter: 6,
  minimumGutter: 1,
} as const;

export function PageTemplate({
  title,
  hideTitle = false,
  hideScrollbar = false,
  children,
  removeMargin = false,
  ignoreNav = false,
  transparentNav = false,
  paginated = false,
  maxWidth,
}: PageTemplateProps) {
  const hasTitle = Boolean(title?.trim());
  const fullWidth = removeMargin || paginated;
  const contentMaxWidth = maxWidth ?? (fullWidth ? false : "lg");

  return (
    <Container
      component="main"
      id="main-content"
      data-ignore-nav={ignoreNav}
      data-transparent-nav={transparentNav}
      data-hide-scrollbar={hideScrollbar}
      aria-labelledby={hasTitle ? "pt-title" : undefined}
      disableGutters
      maxWidth={typeof contentMaxWidth === "number" ? false : contentMaxWidth}
      sx={(theme) => ({
        flex: 1,
        flexShrink: 0,
        // Auto margins center the container within the configured maximum width.
        width: fullWidth
          ? "100%"
          : `max(min(${pageLayout.minimumContentWidth}px, calc(100% - ${theme.spacing(pageLayout.minimumGutter * 2)})), calc(100% - ${theme.spacing(pageLayout.horizontalGutter * 2)}))`,
        ...(typeof contentMaxWidth === "number" && {
          maxWidth: `${contentMaxWidth}px`,
        }),
      })}
    >
      {hasTitle && (
        <Typography
          id="pt-title"
          component="h1"
          variant="h4"
          align="center"
          sx={hideTitle || paginated ? visuallyHidden : { mt: 3 }}
        >
          {title}
        </Typography>
      )}
      <Box
        id="pt-content"
        sx={{
          my: fullWidth ? 0 : pageLayout.gutter,
          ...(paginated && {
            "& > .page-screen:first-of-type": { height: "100cqh" },
          }),
        }}
      >
        {children}
      </Box>
    </Container>
  );
}