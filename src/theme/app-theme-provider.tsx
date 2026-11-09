"use client";

import type { ReactNode } from "react";

import { CssBaseline, ThemeProvider } from "@mui/material";

import { theme } from "@/theme/theme";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}