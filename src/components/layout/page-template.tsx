"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { visuallyHidden } from "@mui/utils";

export interface PageTemplateProps {
  title?: string;
  hideTitle?: boolean;
  children?: ReactNode;
  removeMargin?: boolean;
}

export function PageTemplate({
  title,
  hideTitle = false,
  children,
  removeMargin = false,
}: PageTemplateProps) {
  const hasTitle = Boolean(title?.trim());

  return (
    <Box
      component="main"
      id="main-content"
      aria-labelledby={hasTitle ? "page-title" : undefined}
      sx={{ flex: 1 }}
    >
      {hasTitle && (
        <Typography
          id="page-title"
          component="h1"
          variant="h4"
          align="center"
          sx={hideTitle ? visuallyHidden : { mt: 3 }}
        >
          {title}
        </Typography>
      )}
      <Box id="page-content" sx={{ m: removeMargin ? 0 : 3 }}>
        {children}
      </Box>
    </Box>
  );
}