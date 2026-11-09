"use client";

import { createTheme } from "@mui/material";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    background: { default: "#fafafa", paper: "#ffffff" },
  },
  typography: {
    fontFamily: [
      '"Segoe UI"',
      '"PingFang SC"',
      '"Microsoft YaHei"',
      "sans-serif",
    ].join(", "),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollbarGutter: "stable both-edges" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 1, color: "default" },
    },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiLink: { defaultProps: { underline: "none", color: "inherit" } },
  },
});