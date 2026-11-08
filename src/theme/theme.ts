"use client";

import { createTheme } from "@mui/material/styles";

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
    MuiAppBar: {
      defaultProps: { elevation: 1, color: "default" },
    },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiLink: { defaultProps: { underline: "none", color: "inherit" } },
  },
});