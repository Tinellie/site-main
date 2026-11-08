"use client";

import { useId, type ReactNode } from "react";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

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
      <Typography id={titleId} className="ps-title" component="h2" variant="h5">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}