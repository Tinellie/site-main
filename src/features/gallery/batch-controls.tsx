"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import NextLink from "next/link";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Link,
  Menu, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import type { BatchInput, BatchResult, ConflictPolicy, FolderPolicy } from "./batch-types";

const storageKey = "gallery-clipboard";
const subscribers = new Set<() => void>();
function subscribe(callback: () => void) {
  subscribers.add(callback);
  window.addEventListener("storage", callback);
  return () => { subscribers.delete(callback); window.removeEventListener("storage", callback); };
}
function setClipboard(value: { action: "copy" | "move"; paths: string[] } | null) {
  if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
  else sessionStorage.removeItem(storageKey);
  subscribers.forEach(callback => callback());
}

export function GalleryBatchControls({ directory, selected, selecting, onSelecting, onComplete }: {
  directory: string;
  selected: string[];
  selecting: boolean;
  onSelecting: (value: boolean) => void;
  onComplete: () => void;
}) {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, () => sessionStorage.getItem(storageKey), () => null);
  let clipboard: { action: "copy" | "move"; paths: string[] } | null = null;
  let clipboardError = false;
  if (snapshot) {
    try {
      const parsed: unknown = JSON.parse(snapshot);
      if (parsed && typeof parsed === "object" && "action" in parsed &&
        (parsed.action === "copy" || parsed.action === "move") && "paths" in parsed &&
        Array.isArray(parsed.paths) && parsed.paths.every(path => typeof path === "string")) {
        clipboard = { action: parsed.action, paths: parsed.paths };
      } else clipboardError = true;
    } catch { clipboardError = true; }
  }
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [operation, setOperation] = useState<BatchInput | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [conflictPanel, setConflictPanel] = useState<"files" | "folders" | null>(null);
  const [filePolicy, setFilePolicy] = useState<ConflictPolicy | "">("");
  const [folderPolicy, setFolderPolicy] = useState<FolderPolicy | "">("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function begin(input: BatchInput) {
    setAnchor(null); setOperation(input); setResult(null); setConflictPanel(null);
    setFilePolicy(""); setFolderPolicy(""); setError("");
  }
  async function execute(immediate?: BatchInput) {
    const active = immediate ?? operation;
    if (!active || busyRef.current) return;
    const selectedFilePolicy = immediate ? "" : filePolicy;
    const selectedFolderPolicy = immediate ? "" : folderPolicy;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const input = {
        ...active, filePolicy: selectedFilePolicy || undefined, folderPolicy: selectedFolderPolicy || undefined,
        confirmReferences: !immediate && !!result?.usage,
      };
      const response = await fetch("/api/gallery/batch", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const payload: BatchResult & { message?: string } = await response.json();
      if (!response.ok && !(response.status === 409 && (payload.conflicts || payload.usage))) {
        throw new Error(payload.message || "批量操作失败。");
      }
      if (!payload.completed) {
        setResult(payload);
        setConflictPanel(payload.conflicts?.folders && !selectedFolderPolicy ? "folders" :
          payload.conflicts?.files && !selectedFilePolicy ? "files" : null);
        return;
      }
      if (active.action === "move") {
        setClipboard(null);
      }
      setOperation(null); setResult(null); onComplete(); onSelecting(false);
      setNotice(payload.skipped?.length ? `操作完成，跳过 ${payload.skipped.length} 项。` : "操作完成。");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "批量操作失败。");
    } finally { busyRef.current = false; setBusy(false); }
  }
  const conflicts = result?.conflicts;
  return <>
    <Button variant={selecting ? "contained" : "outlined"} onClick={() => onSelecting(!selecting)}>
      {selecting ? `取消选取（${selected.length}）` : "批量选取"}
    </Button>
    {clipboard && <Typography variant="caption" color="text.secondary">
      已{clipboard.action === "copy" ? "复制" : "剪切"} {clipboard.paths.length} 项，请进入目标目录粘贴。
    </Typography>}
    {notice && <Alert onClose={() => setNotice("")}>{notice}</Alert>}
    {clipboardError && <Alert severity="warning" onClose={() => setClipboard(null)}>
      剪贴板数据无效，请清除后重新选择。
    </Alert>}
    <Fab size="small" aria-label="文件操作菜单" onClick={event => setAnchor(event.currentTarget)}
      sx={{ position: "fixed", right: 24, bottom: 24, zIndex: theme => theme.zIndex.fab }}>
      <MoreVert />
    </Fab>
    <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
      {clipboard ? [
        <MenuItem key="paste" onClick={() => {
          const input = { ...clipboard, destination: directory };
          begin(input); void execute(input);
        }}>粘贴</MenuItem>,
        <MenuItem key="cancel" onClick={() => {
          setClipboard(null); setAnchor(null);
        }}>取消{clipboard.action === "copy" ? "复制" : "剪切"}</MenuItem>,
      ] : [
        <MenuItem key="cut" disabled={!selected.length} onClick={() => {
          setClipboard({ action: "move", paths: selected }); onSelecting(false); setAnchor(null);
        }}>剪切</MenuItem>,
        <MenuItem key="copy" disabled={!selected.length} onClick={() => {
          setClipboard({ action: "copy", paths: selected }); onSelecting(false); setAnchor(null);
        }}>复制</MenuItem>,
        <MenuItem key="delete" disabled={!selected.length} onClick={() =>
          begin({ action: "delete", paths: selected, destination: "" })}>删除</MenuItem>,
      ]}
    </Menu>
    <Dialog open={!!operation} onClose={() => { if (!busyRef.current) setOperation(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{conflictPanel === "folders" ? "文件夹冲突" : conflictPanel === "files" ? "文件冲突" :
        operation?.action === "delete" ? "批量删除" : "粘贴项目"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>{operation?.paths.length} 项 · {operation?.action === "delete"
            ? "确认删除所选项目及文件夹内全部内容？" : `目标：assets/${directory}`}</Typography>
          {conflictPanel === "folders" && <Stack spacing={1}>
            <Alert severity="warning">{conflicts?.folders} 处文件夹重名，统一处理全部文件夹冲突。</Alert>
            <TextField select label="文件夹冲突" value={folderPolicy} disabled={busy}
              onChange={event => setFolderPolicy(event.target.value as FolderPolicy)}>
              <MenuItem value="skip">跳过</MenuItem><MenuItem value="overwrite">覆盖（整体替换）</MenuItem>
              <MenuItem value="number">编号 (1)、(2)…</MenuItem><MenuItem value="merge">合并（递归合并子文件夹）</MenuItem>
            </TextField>
          </Stack>}
          {conflictPanel === "files" && <Stack spacing={1}>
            <Alert severity="warning">{conflicts?.files} 处文件重名，统一处理全部文件冲突。</Alert>
            <TextField select label="文件冲突" value={filePolicy} disabled={busy}
              onChange={event => setFilePolicy(event.target.value as ConflictPolicy)}>
              <MenuItem value="skip">跳过</MenuItem><MenuItem value="overwrite">覆盖</MenuItem>
              <MenuItem value="number">编号 (1)、(2)…</MenuItem>
            </TextField>
          </Stack>}
          {result?.usage && <Alert severity="warning">
            {result.usage.connect && <Typography>文件被 Connect 页使用。</Typography>}
            {result.usage.works && <Typography>文件被 Works 页使用。</Typography>}
            {result.usage.articles.map(article => <Typography key={article.id}>
              文件被 <Link component={NextLink} href={`/blog/${article.id}`} target="_blank" rel="noopener noreferrer">
                {article.title}
              </Link> 文章占用。
            </Typography>)}
            继续操作会使这些引用失效。
          </Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setOperation(null)}>取消</Button>
        <Button variant="contained" disabled={busy || (conflictPanel === "files" && !filePolicy) ||
          (conflictPanel === "folders" && !folderPolicy)} onClick={() => void execute()}>
          {busy ? "处理中…" : result?.usage ? "仍然继续" : "确认"}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
