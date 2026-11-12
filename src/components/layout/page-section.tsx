"use client";

import { useId, type ReactNode } from "react";

import { Stack, Typography } from "@mui/material";

export interface PageSectionProps {
  title: string;
  children?: ReactNode;
}

export function PageSection({ title, children }: PageSectionProps) {
  const titleId = useId();

  return (
    <Stack
      component="section"
      className="page-section"
      aria-labelledby={titleId}
      spacing={2}
      useFlexGap
    >
      <Typography 
        id={titleId} 
        className="ps-title" 
        component="h2" variant="h5"
        align="center"
        sx={{ py: 2 }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}