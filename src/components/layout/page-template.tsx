"use client";

import type { ReactNode } from "react";

import { Box, Container, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

export interface PageTemplateProps {
  title?: string;
  hideTitle?: boolean;
  children?: ReactNode;
  removeMargin?: boolean;
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
  children,
  removeMargin = false,
}: PageTemplateProps) {
  const hasTitle = Boolean(title?.trim());

  return (
    <Container
      component="main"
      id="main-content"
      aria-labelledby={hasTitle ? "pt-title" : undefined}
      disableGutters
      maxWidth={removeMargin ? false : "lg"}
      sx={(theme) => ({
        flex: 1,
        // Auto margins center the container; maxWidth uses MUI's lg breakpoint.
        width: removeMargin
          ? "100%"
          : `max(min(${pageLayout.minimumContentWidth}px, calc(100% - ${theme.spacing(pageLayout.minimumGutter * 2)})), calc(100% - ${theme.spacing(pageLayout.horizontalGutter * 2)}))`,
      })}
    >
      {hasTitle && (
        <Typography
          id="pt-title"
          component="h1"
          variant="h4"
          align="center"
          sx={hideTitle ? visuallyHidden : { mt: 3 }}
        >
          {title}
        </Typography>
      )}
      <Box id="pt-content" sx={{ my: removeMargin ? 0 : pageLayout.gutter }}>
        {children}
      </Box>
    </Container>
  );
}