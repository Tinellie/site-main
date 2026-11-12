"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField,
} from "@mui/material";

import { cardRequest } from "@/features/cards/card-api";
import { IconPicker } from "@/features/cards/icon-picker";
import type { CardInput, CardSection, ConnectCategory, ContentCard } from "@/features/cards/types";
import { parseCardInput, parseCategoryName } from "@/features/cards/validation";
import { resolveCardImagePath } from "@/features/cards/image-path";

export function CardEditor({
  card, section, categories, onClose, onSaved, onCategorySaved,
}: {
  card: ContentCard | null;
  section: CardSection;
  categories: readonly ConnectCategory[];
  onClose: () => void;
  onSaved: (card: ContentCard) => void;
  onCategorySaved: (category: ConnectCategory) => void;
}) {
  const [draft, setDraft] = useState<CardInput>(card || {
    kind: section === "connect" ? "connect" : "project",
    title: "", username: "", link: "", description: "", image: "", icon: "Language", categoryId: null,
  });
  const [mode, setMode] = useState<"card" | "category">("card");
  const [categoryName, setCategoryName] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [uploadedPath, setUploadedPath] = useState("");
  const [previewError, setPreviewError] = useState("");

  function update<K extends keyof CardInput>(key: K, value: CardInput[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
  }

  async function upload(file: File) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await cardRequest<{ image: string }>("/api/cards/assets", { method: "POST", body: form });
      setUploadedPath(result.image);
      update("image", result.image);
      setPreview(resolveCardImagePath(result.image));
      setPreviewError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "上传失败。");
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode === "category" && section === "connect" && !card) {
        const name = parseCategoryName({ name: categoryName });
        const result = await cardRequest<{ category: ConnectCategory }>("/api/cards/categories", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
        });
        onCategorySaved(result.category);
        return;
      }
      const input = parseCardInput(draft);
      if (uploadedPath && input.image && input.image !== uploadedPath) {
        const moved = await cardRequest<{ image: string }>("/api/cards/assets", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: uploadedPath, target: input.image }),
        });
        input.image = moved.image;
        setUploadedPath(moved.image);
        update("image", moved.image);
        setPreview(resolveCardImagePath(moved.image));
      }
      const result = await cardRequest<{ card: ContentCard }>(card ? `/api/cards/${card.id}` : "/api/cards", {
        method: card ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      onSaved(result.card);
    } catch (error) {
      setError(error instanceof Error ? error.message : "保存失败。");
    } finally { busyRef.current = false; setBusy(false); }
  }

  function previewImage() {
    try {
      const url = draft.image ? resolveCardImagePath(draft.image) : "";
      setPreviewError("");
      return url;
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "图片路径无效。");
      return "";
    }
  }
  const [preview, setPreview] = useState(() => card?.image ? resolveCardImagePath(card.image) : "");

  return (
    <>
      <Dialog
        open onClose={() => { if (!busyRef.current) onClose(); }} fullWidth maxWidth="sm"
      >
        <Box component="form" onSubmit={save}>
          <DialogTitle>{card ? "编辑卡片" : mode === "category" ? "新增分类" : "新增卡片"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Box component="fieldset" disabled={busy} sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
                <Stack spacing={2}>
                  {section === "connect" && !card && (
                    <TextField select label="新增类型" value={mode} onChange={event => {
                      if (event.target.value === "card" || event.target.value === "category") {
                        setMode(event.target.value);
                        setError("");
                      }
                    }}>
                      <MenuItem value="card">card</MenuItem>
                      <MenuItem value="category">category</MenuItem>
                    </TextField>
                  )}
                  {mode === "category" ? (
                    <TextField label="Category Name" value={categoryName} required
                      slotProps={{ htmlInput: { maxLength: 100 } }}
                      onChange={event => setCategoryName(event.target.value)} />
                  ) : (
                    <>
                  {section === "works" && (
                    <TextField select label="类型" value={draft.kind} onChange={event => {
                      if (event.target.value === "project" || event.target.value === "article") update("kind", event.target.value);
                    }}>
                      <MenuItem value="project">Project</MenuItem>
                      <MenuItem value="article">Article</MenuItem>
                    </TextField>
                  )}
                  <Stack direction="row" spacing={2}>
                    <TextField label="Title" value={draft.title} required slotProps={{ htmlInput: { maxLength: 200 } }}
                      sx={{ flex: 1, minWidth: 0 }} onChange={event => update("title", event.target.value)} />
                    {section === "connect" && (
                      <TextField label="UserName" value={draft.username} sx={{ flex: 1, minWidth: 0 }}
                        slotProps={{ htmlInput: { maxLength: 200 } }}
                        onChange={event => update("username", event.target.value)} />
                    )}
                  </Stack>
                  <TextField label="Link" value={draft.link} required
                    onChange={event => update("link", event.target.value)} />
                  {section === "connect" && (
                    <TextField select label="Category" value={draft.categoryId ?? ""}
                      onChange={event => update("categoryId", event.target.value === "" ? null : Number(event.target.value))}
                      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                      <MenuItem value="">无分类（顶部）</MenuItem>
                      {categories.map(category => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                    </TextField>
                  )}
                  {section === "works" && (
                    <TextField label="Description" multiline minRows={3} value={draft.description}
                      onChange={event => update("description", event.target.value)} />
                  )}
                  {section === "connect" && (
                    <Button variant="outlined" onClick={() => setPicker(true)} startIcon={
                      <Box component="img" src={`/api/icons/${draft.icon}`} alt="" sx={{ width: 24, height: 24 }} />
                    }>Icon：{draft.icon}</Button>
                  )}
                  <TextField
                    label="Image" value={draft.image}
                    onChange={event => { update("image", event.target.value); setPreview(""); }}
                    onBlur={() => setPreview(previewImage())}
                    helperText={`assets 下的相对路径，例如 folder/image.png${section === "connect" ? "；设置后覆盖 Icon" : ""}。`}
                  />
                  <Button component="label" variant="outlined">
                    上传图片
                    <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.avif" hidden
                      onChange={event => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void upload(file);
                      }} />
                  </Button>
                  {uploadedPath && (
                    <Alert severity="info">
                      已上传：{uploadedPath}。修改 Image 路径后保存，会移动或重命名本次上传图片，不覆盖已有文件。
                      取消编辑或删除卡片不会删除图片。
                    </Alert>
                  )}
                  {draft.image && (
                    <Box sx={{ height: 180, display: "grid", placeItems: "center", overflow: "auto" }}>
                      {previewError && <Alert severity="warning">{previewError}</Alert>}
                      {preview && <Box component="img" src={preview} alt="图片预览"
                        onError={() => setPreviewError("图片无法加载，请检查路径。")}
                        sx={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain" }} />}
                    </Box>
                  )}
                    </>
                  )}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={onClose}>取消</Button>
            <Button type="submit" variant="contained" disabled={busy}>{busy ? "处理中…" : "保存"}</Button>
          </DialogActions>
        </Box>
      </Dialog>
      <IconPicker open={mode === "card" && picker} onClose={() => setPicker(false)} onSelect={name => update("icon", name)} />
    </>
  );
}
