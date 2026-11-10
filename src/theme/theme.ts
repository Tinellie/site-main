"use client";

import { createTheme } from "@mui/material";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    background: { default: "#121212", paper: "#1e1e1e" },
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
        html: { height: "100%", overflow: "hidden" },
        body: { height: "100%", overflow: "hidden" },
        "body:has(.MuiModal-root:not(.MuiModal-hidden)) #ss-page": {
          overflowY: "hidden",
        },
        "body:has(.MuiModal-root:not(.MuiModal-hidden)) #ss-scrollbar": {
          display: "none",
        },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-track, *::-webkit-scrollbar-corner": {
          background: "transparent",
        },
        "*::-webkit-scrollbar-button": {
          display: "none",
          width: 0,
          height: 0,
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          border: "2px solid transparent",
          backgroundClip: "padding-box",
          borderRadius: 8,
        },
        "*::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        },
        "@supports not selector(::-webkit-scrollbar)": {
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255, 255, 255, 0.3) transparent",
          },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 1, color: "default" },
    },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiLink: { defaultProps: { underline: "none", color: "inherit" } },
  },
});