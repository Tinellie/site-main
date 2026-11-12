"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Stack, TextField, Typography,
} from "@mui/material";

import type { AssetUsage } from "./types";

export type FileOperation =
  | { kind: "upload"; file: File }
  | { kind: "edit"; path: string }
  | { kind: "delete"; path: string };

interface FileResponse {
  path?: string;
  exists?: boolean;
  createsFolder?: boolean;
  usage?: AssetUsage;
  message?: string;
}

async function readResponse(response: Response): Promise<FileResponse> {
  const result: FileResponse = await response.json();
  if (!response.ok && !(response.status === 409 && result.usage)) {
    throw new Error(result.message || `文件操作失败 (${response.status})。`);
  }
  return result;
}

export function FileDialog({ operation, onClose, onComplete }: {
  operation: FileOperation;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [path, setPath] = useState(operation.kind === "upload" ? "" : operation.path);
  const [inspectedPath, setInspectedPath] = useState("");
  const [createsFolder, setCreatesFolder] = useState(false);
  const [usage, setUsage] = useState<AssetUsage | null>(null);
  const [confirmReferences, setConfirmReferences] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const isDelete = operation.kind === "delete";
  const hasReferences = !!usage && (usage.connect || usage.works || usage.articles.length > 0);

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        if (operation.kind === "upload") {
          const query = new URLSearchParams({ action: "suggest", path: operation.file.name });
          const result = await readResponse(await fetch(`/api/gallery/files?${query}`, { signal: controller.signal }));
          if (!result.path) throw new Error("未能生成上传路径。");
          setPath(result.path);
        } else if (operation.kind === "delete") {
          const query = new URLSearchParams({ action: "references", path: operation.path });
          const result = await readResponse(await fetch(`/api/gallery/files?${query}`, { signal: controller.signal }));
          if (!result.usage) throw new Error("未能读取文件引用。");
          setUsage(result.usage);
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "读取文件信息失败。");
      } finally {
        if (!controller.signal.aborted) setInitializing(false);
      }
    }
    void initialize();
    return () => controller.abort();
  }, [operation]);

  useEffect(() => {
    if (isDelete || initializing || !path) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ path });
        const result = await readResponse(await fetch(`/api/gallery/files?${query}`, { signal: controller.signal }));
        if (controller.signal.aborted) return;
        if (result.exists && !(operation.kind === "edit" && path === operation.path)) {
          throw new Error("Path 已存在同名文件。");
        }
        setCreatesFolder(!!result.createsFolder);
        setInspectedPath(path);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "检查 Path 失败。");
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [path, initializing, isDelete, operation]);

  async function submit() {
    if (hasReferences && !confirmReferences) {
      setConfirmReferences(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      let response: Response;
      if (operation.kind === "upload") {
        const form = new FormData();
        form.set("file", operation.file);
        form.set("path", path);
        response = await fetch("/api/gallery/files", { method: "POST", body: form });
      } else {
        response = await fetch("/api/gallery/files", {
          method: isDelete ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: operation.path, target: path, confirmReferences }),
        });
      }
      const result = await readResponse(response);
      if (response.status === 409 && result.usage) {
        setUsage(result.usage);
        setConfirmReferences(false);
        setError("文件引用已更新，请重新确认。");
        return;
      }
      onComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : "文件操作失败。");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm"
      aria-labelledby="gallery-file-dialog-title">
      <DialogTitle id="gallery-file-dialog-title">
        {isDelete ? "删除文件" : operation.kind === "upload" ? "上传图片" : "编辑文件"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {isDelete ? (
            <>
              <Typography sx={{ overflowWrap: "anywhere" }}>确定删除 {path}？此操作无法撤销。</Typography>
              {usage?.connect && <Alert severity="warning">文件被 Connect 页使用。</Alert>}
              {usage?.works && <Alert severity="warning">文件被 Works 页使用。</Alert>}
              {!!usage?.articles.length && <Alert severity="warning">
                <Stack spacing={0.5}>
                  {usage.articles.map(article => <Typography key={article.id} variant="body2">
                    文件被 <Link component={NextLink} href={`/blog/${article.id}`} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </Link> 文章占用。
                  </Typography>)}
                </Stack>
              </Alert>}
              {confirmReferences && <Alert severity="error">仍要删除？引用此文件的页面和文章将无法显示该图片。</Alert>}
            </>
          ) : (
            <>
              <TextField autoFocus fullWidth label="Path" value={path} disabled={saving || initializing}
                onChange={event => {
                  setPath(event.target.value);
                  setInspectedPath("");
                  setCreatesFolder(false);
                  setError("");
                }} />
              {createsFolder && <Alert severity="warning">将创建新文件夹。</Alert>}
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="contained" color={isDelete ? "error" : "primary"} onClick={() => void submit()}
          disabled={saving || initializing || (isDelete ? !usage : !path || inspectedPath !== path)}>
          {saving ? "正在处理…" : isDelete ? (hasReferences ? (confirmReferences ? "仍然删除" : "继续删除") : "确认删除")
            : operation.kind === "upload" ? "确认上传" : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
