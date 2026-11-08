"use client";

import NextLink from "next/link";

import EditIcon from "@mui/icons-material/Edit";
import Fab from "@mui/material/Fab";

export function EditPostFab({ id }: { id: number }) {
  return (
    <Fab
      color="secondary"
      aria-label="编辑文章"
      component={NextLink}
      href={`/blog/${id}/edit`}
      sx={{
        position: "fixed",
        right: 24,
        bottom: 24,
      }}
    >
      <EditIcon />
    </Fab>
  );
}
