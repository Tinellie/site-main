"use client";

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, Typography,
} from "@mui/material";

import { cardRequest } from "@/features/cards/card-api";

export function IconPicker({
  open, onClose, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ names: string[]; total: number }>({ names: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await cardRequest<{ names: string[]; total: number }>(
          `/api/icons?q=${encodeURIComponent(query)}&offset=${offset}`,
          { signal: controller.signal },
        );
        setData(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "图标搜索失败。");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, offset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>选择 MUI 图标</DialogTitle>
      <DialogContent>
        <TextField
          label="搜索图标名称" value={query} fullWidth autoFocus margin="dense"
          onChange={event => { setQuery(event.target.value); setOffset(0); }}
          helperText="按英文名称搜索，包含 Outlined、Rounded、TwoTone、Sharp 等变体。"
        />
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? <CircularProgress aria-label="搜索图标中" sx={{ m: 2 }} /> : (
          <>
            <Typography variant="caption">{data.total} 个图标</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 1 }}>
              {data.names.map(name => (
                <Button
                  key={name} onClick={() => { onSelect(name); onClose(); }}
                  title={name} sx={{ flexDirection: "column", textTransform: "none", overflow: "hidden" }}
                >
                  <Box component="img" src={`/api/icons/${name}`} alt="" loading="lazy" sx={{ width: 28, height: 28 }} />
                  <Typography variant="caption" noWrap sx={{ width: "100%" }}>{name}</Typography>
                </Button>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={offset === 0 || loading} onClick={() => setOffset(value => Math.max(0, value - 60))}>上一页</Button>
        <Button disabled={offset + 60 >= data.total || loading} onClick={() => setOffset(value => value + 60)}>下一页</Button>
        <Button onClick={onClose}>取消</Button>
      </DialogActions>
    </Dialog>
  );
}
