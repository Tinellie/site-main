"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip,
} from "@mui/material";
import { ArrowDownward, ArrowUpward, Delete, Edit } from "@mui/icons-material";

import { cardRequest } from "@/features/cards/card-api";
import type { CategoryMutation, ConnectCategory } from "@/features/cards/types";
import { parseCategoryName } from "@/features/cards/validation";

export function CategoryActions({
  category, first, last, onChanged,
}: {
  category: ConnectCategory;
  first: boolean;
  last: boolean;
  onChanged: (categories: ConnectCategory[], deletedId?: number) => void;
}) {
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  async function mutate(mutation?: CategoryMutation) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await cardRequest<{ categories: ConnectCategory[] }>(`/api/cards/categories/${category.id}`, {
        method: mutation ? "PATCH" : "DELETE",
        ...(mutation && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(mutation) }),
      });
      onChanged(result.categories, mutation ? undefined : category.id);
      setDialog(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "分类操作失败。");
    } finally { busyRef.current = false; setBusy(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (dialog === "delete") { void mutate(); return; }
    try { void mutate({ name: parseCategoryName({ name }) }); }
    catch (error) { setError(error instanceof Error ? error.message : "分类名称无效。"); }
  }

  return (
    <>
      <Stack className="category-actions" direction="row" spacing={0.5} role="group"
        aria-label={`${category.name} 分类操作`} sx={{
          opacity: 0, pointerEvents: "none", transition: "opacity 150ms",
          "@media (hover: none)": { opacity: 1, pointerEvents: "auto" },
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}>
        <Tooltip title="重命名"><span><IconButton size="small" disabled={busy} aria-label={`重命名分类 ${category.name}`}
          onClick={() => { setName(category.name); setError(""); setDialog("rename"); }}><Edit fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="删除"><span><IconButton size="small" disabled={busy} aria-label={`删除分类 ${category.name}`}
          onClick={() => { setError(""); setDialog("delete"); }}><Delete fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="上移"><span><IconButton size="small" disabled={busy || first} aria-label={`上移分类 ${category.name}`}
          onClick={() => void mutate({ direction: "up" })}><ArrowUpward fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="下移"><span><IconButton size="small" disabled={busy || last} aria-label={`下移分类 ${category.name}`}
          onClick={() => void mutate({ direction: "down" })}><ArrowDownward fontSize="small" /></IconButton></span></Tooltip>
      </Stack>
      {error && !dialog && <Alert severity="error">{error}</Alert>}
      <Dialog open={dialog !== null} onClose={() => { if (!busyRef.current) setDialog(null); }} fullWidth maxWidth="xs">
        <form onSubmit={submit}>
          <DialogTitle>{dialog === "rename" ? "重命名分类" : "删除分类"}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {dialog === "rename" ? (
              <TextField label="Category Name" value={name} onChange={event => setName(event.target.value)}
                required fullWidth autoFocus disabled={busy} margin="dense" slotProps={{ htmlInput: { maxLength: 100 } }} />
            ) : `确定删除分类“${category.name}”？其中的卡片会移回顶部空分类，不会被删除。`}
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setDialog(null)}>取消</Button>
            <Button type="submit" disabled={busy} color={dialog === "delete" ? "error" : "primary"}>
              {busy ? "处理中…" : dialog === "rename" ? "保存" : "删除"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
