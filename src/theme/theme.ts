"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#516358" },
    background: { default: "#fafaf8", paper: "#ffffff" },
    text: { primary: "#252b27", secondary: "#6b736d" },
    divider: "#e8ebe6",
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  typography: {
    fontFamily: [
      '"Segoe UI"',
      '"PingFang SC"',
      '"Microsoft YaHei"',
      "sans-serif",
    ].join(", "),
    h6: { fontWeight: 600, fontSize: "1.125rem", letterSpacing: "0.08em" },
    button: { textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { minHeight: "100%" },
        body: { minHeight: "100dvh" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: theme.spacing(8),
          [theme.breakpoints.up("sm")]: { minHeight: theme.spacing(9) },
        }),
      },
    },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiLink: { defaultProps: { underline: "none", color: "inherit" } },
  },
});