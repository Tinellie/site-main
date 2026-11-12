"use client";

import type { ReactNode } from "react";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import { ArrowDownward, ArrowUpward, Delete, Edit } from "@mui/icons-material";

export function EditableCard({
  children, title, enabled, onEdit, onDelete, onMove, first, last, busy = false,
}: {
  children: ReactNode;
  title: string;
  enabled: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onMove?: (direction: "up" | "down") => void;
  first?: boolean;
  last?: boolean;
  busy?: boolean;
}) {
  return (
    <Box sx={{
      position: "relative", minWidth: 0,
      "&:hover .ecard-actions, &:focus-within .ecard-actions": { opacity: 1, pointerEvents: "auto" },
    }}>
      {children}
      {enabled && (
        <Stack className="ecard-actions" direction="row" spacing={0.5} sx={{
          position: "absolute", right: 12, top: 12, opacity: 0, pointerEvents: "none",
          "@media (hover: none)": { opacity: 1, pointerEvents: "auto" },
        }}>
          <Tooltip title="编辑">
            <IconButton aria-label={`编辑 ${title}`} size="small" onClick={onEdit} disabled={busy}
              sx={{ bgcolor: "background.paper", "&:hover": { bgcolor: "action.selected" } }}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {onMove && <>
            <Tooltip title="上移"><span>
              <IconButton aria-label={`上移 ${title}`} size="small" disabled={busy || first}
                onClick={() => onMove("up")}
                sx={{ bgcolor: "background.paper", "&:hover": { bgcolor: "action.selected" } }}>
                <ArrowUpward fontSize="small" />
              </IconButton>
            </span></Tooltip>
            <Tooltip title="下移"><span>
              <IconButton aria-label={`下移 ${title}`} size="small" disabled={busy || last}
                onClick={() => onMove("down")}
                sx={{ bgcolor: "background.paper", "&:hover": { bgcolor: "action.selected" } }}>
                <ArrowDownward fontSize="small" />
              </IconButton>
            </span></Tooltip>
          </>}
          {onDelete && <Tooltip title="删除">
            <IconButton aria-label={`删除 ${title}`} size="small" onClick={onDelete} disabled={busy}
              sx={{ bgcolor: "background.paper", "&:hover": { bgcolor: "action.selected" } }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>}
        </Stack>
      )}
    </Box>
  );
}
