"use client";

import { Children, type ReactNode } from "react";

import Grid, { type GridProps } from "@mui/material/Grid";

export function ResponsiveCardGrid({
  children,
  className = "",
  itemSize = { xs: 12, sm: 6, md: 4, lg: 3 },
}: {
  children: ReactNode;
  className?: string;
  itemSize?: GridProps["size"];
}) {
  return (
    <Grid
      container
      spacing={2}
      className={`responsive-card-grid ${className}`.trim()}
    >
      {Children.map(children, (child) => (
        <Grid size={itemSize} className="rcg-item">
          {child}
        </Grid>
      ))}
    </Grid>
  );
}