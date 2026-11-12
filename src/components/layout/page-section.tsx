"use client";

import { useId, type ReactNode } from "react";

import { Box, Stack, Typography } from "@mui/material";

export interface PageSectionProps {
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageSection({ title, actions, children }: PageSectionProps) {
  const titleId = useId();

  return (
    <Stack
      component="section"
      className="page-section"
      aria-labelledby={titleId}
      spacing={2}
      useFlexGap
    >
      <Stack className="ps-heading" sx={{
        alignItems: "center",
        pb: actions ? { xs: 4, sm: 0 } : 0,
        "&:hover .category-actions, &:focus-within .category-actions": { opacity: 1, pointerEvents: "auto" },
      }}>
        <Box sx={{
          position: "relative", maxWidth: "100%",
          "& .category-actions": {
            position: "absolute",
            left: { xs: "50%", sm: "calc(100% + 8px)" },
            top: { xs: "100%", sm: "50%" },
            transform: { xs: "translateX(-50%)", sm: "translateY(-50%)" },
          },
        }}>
          <Typography
            id={titleId}
            className="ps-title"
            component="h2" variant="h5"
            align="center"
            sx={{ py: 2, minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" }}
          >
            {title}
          </Typography>
          {actions}
        </Box>
      </Stack>
      {children}
    </Stack>
  );
}