import { Box, CircularProgress, Typography } from "@mui/material";

export default function Loading() {
  return (
    <Box role="status" sx={{ flex: 1, display: "grid", placeContent: "center", justifyItems: "center", gap: 2, p: 3 }}>
      <CircularProgress aria-label="页面加载中" />
      <Typography color="text.secondary">页面加载中…</Typography>
    </Box>
  );
}
