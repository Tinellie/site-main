"use client";

import { alpha, createTheme, type Theme } from "@mui/material";

function glassSurface(theme: Theme) {
  return {
    backgroundColor: alpha(theme.palette.background.paper, 0.9),
    backgroundImage: "none",
    border: "1px solid",
    borderColor: alpha(theme.palette.common.white, 0.15),
    "@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))": {
      backgroundColor: alpha(theme.palette.background.paper, 0.45),
      backdropFilter: "blur(12px) saturate(140%)",
      WebkitBackdropFilter: "blur(12px) saturate(140%)",
    },
  };
}

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
    MuiCard: {
      styleOverrides: { root: ({ theme }) => glassSurface(theme) },
    },
    MuiPopover: {
      styleOverrides: { paper: ({ theme }) => glassSurface(theme) },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme, ownerState }) => ownerState.fullScreen ? {} : glassSurface(theme),
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: { height: "100%", overflow: "hidden" },
        body: { height: "100%", overflow: "hidden" },
        ".card-reveal .MuiCard-root": {
          backgroundColor: "#1e1e1e",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        },
        "@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))": {
          "@keyframes card-glass-reveal": {
            from: { backgroundColor: "#1e1e1e" },
            to: { backgroundColor: "rgba(30, 30, 30, 0.45)" },
          },
          ".card-reveal[data-revealed='true'] .MuiCard-root": {
            backdropFilter: "blur(12px) saturate(140%)",
            WebkitBackdropFilter: "blur(12px) saturate(140%)",
            animation: "card-glass-reveal 500ms ease-out 320ms both",
          },
          "@media (prefers-reduced-motion: reduce)": {
            ".card-reveal[data-revealed='true'] .MuiCard-root": {
              animation: "none",
              backgroundColor: "rgba(30, 30, 30, 0.45)",
            },
          },
        },
        "::view-transition-group(site-page), ::view-transition-old(site-page), ::view-transition-new(site-page)": {
          animationDuration: "220ms",
          animationTimingFunction: "ease-in-out",
        },
        "::view-transition-old(root), ::view-transition-new(root)": {
          animation: "none",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*)": {
            animationDuration: "0s !important",
            animationDelay: "0s !important",
          },
        },
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