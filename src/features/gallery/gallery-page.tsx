"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import {
  Folder as FolderIcon, InsertDriveFile as InsertDriveFileIcon,
  Image as ImageIcon, Movie as MovieIcon, AudioFile as AudioFileIcon,
  Description as DescriptionIcon,
  Upload as UploadIcon,
  ViewList as ViewListIcon, GridView as GridViewIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card, CardActionArea, Checkbox,
  Dialog, DialogContent, DialogTitle,
  Link,
  MenuItem,
  Stack,
  TextField,
  ToggleButton, ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { PageTemplate } from "@/components/layout/page-template";
import { CardReveal, CardRevealGroup } from "@/components/cards/card-reveal";
import type { AssetEntry, AssetKind } from "@/features/gallery/types";
import { useAuth } from "@/features/auth/auth-provider";
import { EditableCard } from "@/features/cards/editable-card";
import type { FileOperation } from "./file-dialog";
import { GalleryBatchControls } from "./batch-controls";

const FileDialog = dynamic(() => import("./file-dialog").then(module => module.FileDialog));

const icons = {
  folder: FolderIcon, image: ImageIcon, video: MovieIcon,
  audio: AudioFileIcon, text: DescriptionIcon, file: InsertDriveFileIcon,
};
const labels: Record<AssetKind, string> = {
  folder: "文件夹", image: "图片", video: "视频", audio: "音频", text: "文本", file: "文件",
};

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`读取文本失败 (${response.status})。`);
        setText(await response.text());
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "读取文本失败。");
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [url]);
  return error ? <Alert severity="error">{error}</Alert> : (
    <Box component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", m: 0 }}>
      {text === null ? "正在加载…" : text || "（空文件）"}
    </Box>
  );
}

export function GalleryPage({
  segments, entries,
}: {
  segments: string[];
  entries: AssetEntry[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [operation, setOperation] = useState<FileOperation | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<AssetEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<{ directory: string; paths: string[] }>({ directory: "", paths: [] });
  const directory = segments.join("/");
  const selectedPaths = selection.directory === directory ? selection.paths : [];
  function toggleSelection(relative: string) {
    setSelection(previous => {
      const paths = previous.directory === directory ? previous.paths : [];
      return { directory, paths: paths.includes(relative) ? paths.filter(path => path !== relative) : [...paths, relative] };
    });
  }
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const collator = new Intl.Collator(undefined, { numeric: true });
    return entries.filter(entry =>
      entry.name.toLocaleLowerCase().includes(query)
    ).sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;
      let result = collator.compare(a.name, b.name);
      if (sort.startsWith("date")) result = a.modifiedAt.localeCompare(b.modifiedAt);
      if (sort.startsWith("size")) result = a.size - b.size;
      if (sort === "type") result = a.kind.localeCompare(b.kind) || result;
      return (sort.endsWith("desc") ? -result : result) ||
        collator.compare(a.name, b.name);
    });
  }, [entries, search, sort]);
  const displayed: AssetEntry[] = segments.length ? [{
    name: "..",
    kind: "folder",
    url: segments.length === 1
      ? "/gallery"
      : `/gallery/${segments.slice(0, -1).map(encodeURIComponent).join("/")}`,
    size: 0,
    modifiedAt: "",
  }, ...visible] : visible;

  return (
    <PageTemplate title="Gallery" hideTitle={true}>
      <Stack spacing={2}>
        <Breadcrumbs aria-label="目录导航">
          <Link component={NextLink} href="/gallery">assets</Link>
          {segments.map((segment, index) => (
            <Link key={index} component={NextLink}
              href={`/gallery/${segments.slice(0, index + 1).map(encodeURIComponent).join("/")}`}
              aria-current={index === segments.length - 1 ? "page" : undefined}>
              {segment}
            </Link>
          ))}
        </Breadcrumbs>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {user && <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
            上传图片
            <input hidden type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml,.svg"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) setOperation({ kind: "upload", file });
                event.target.value = "";
              }} />
          </Button>}
          <TextField label="搜索当前目录" type="search" size="small" value={search}
            onChange={event => setSearch(event.target.value)} sx={{ flex: 1 }} />
          <TextField select label="排序" size="small" value={sort}
            onChange={event => setSort(event.target.value)} sx={{ minWidth: 160 }}>
            {[
              ["name-asc", "名称升序"], ["name-desc", "名称降序"],
              ["date-desc", "最新修改"], ["date-asc", "最早修改"],
              ["size-desc", "大小降序"], ["size-asc", "大小升序"], ["type", "文件类型"],
            ].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <ToggleButtonGroup exclusive value={view} aria-label="显示方式"
            onChange={(_, value: "grid" | "list" | null) => { if (value) setView(value); }}>
            <ToggleButton value="grid" aria-label="方形卡片"><GridViewIcon /></ToggleButton>
            <ToggleButton value="list" aria-label="列表"><ViewListIcon /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {user && <GalleryBatchControls directory={directory} selected={selectedPaths} selecting={selecting}
          onSelecting={setSelecting} onComplete={() => setSelection({ directory, paths: [] })} />}
        <Typography variant="body2" color="text.secondary">{visible.length} 个项目 · 文件夹优先</Typography>
        {!visible.length && <Alert severity="info">{search ? "没有匹配的文件或文件夹。" : "此文件夹为空。"}</Alert>}
        <CardRevealGroup key={`${view}:${sort}:${displayed.map(entry => entry.url).join("|")}`}>
        <Box sx={{
          display: "grid", gap: 2,
          gridTemplateColumns: view === "grid" ? "repeat(auto-fill, minmax(min(160px, 100%), 1fr))" : "1fr",
        }}>
          {displayed.map(entry => {
            const Icon = icons[entry.kind];
            const content = <>
              <Box sx={{
                position: "relative", overflow: "hidden", display: "flex",
                alignItems: "center", justifyContent: "center",
                ...(view === "grid" ? { flex: 1, width: "100%", minHeight: 0 } : { width: 56, height: 56, flexShrink: 0 }),
              }}>
                {entry.kind === "image" ? (
                  <Image src={`${entry.url}?v=${encodeURIComponent(entry.modifiedAt)}`} alt={entry.name} fill loading="eager" unoptimized
                    sizes={view === "list" ? "56px" : "(max-width: 416px) calc(100vw - 16px), 240px"}
                    style={{ objectFit: "cover" }} />
                ) : <Icon sx={{ fontSize: view === "grid" ? 48 : 32 }} color="primary" />}
              </Box>
              <Box sx={{ p: 1.5, minWidth: 0, ...(view === "list" && { flex: 1 }) }}>
                <Typography noWrap title={entry.name}>{entry.name}</Typography>
                {entry.modifiedAt && (
                  <Typography variant="caption" color="text.secondary" noWrap component="p">
                    {labels[entry.kind]}{entry.kind !== "folder" && ` · ${formatSize(entry.size)}`}
                  </Typography>
                )}
                {view === "list" && entry.modifiedAt && <Typography variant="caption" color="text.secondary">
                  {entry.modifiedAt.replace("T", " ").slice(0, 19)} UTC
                </Typography>}
              </Box>
            </>;
            const sx = {
              display: "flex", height: "100%", minWidth: 0,
              flexDirection: view === "grid" ? "column" : "row",
            } as const;
            const relativePath = [...segments, entry.name].join("/");
            return <CardReveal key={entry.url}><EditableCard title={entry.name}
              enabled={!!user && entry.name !== ".." && !selecting}
              onEdit={() => setOperation({ kind: "edit", path: relativePath, folder: entry.kind === "folder" })}
              onDelete={entry.kind === "folder" ? undefined : () => setOperation({ kind: "delete", path: relativePath })}><Card
              sx={{ position: "relative", outline: selectedPaths.includes(relativePath) ? "2px solid" : undefined,
                outlineColor: "primary.main", ...(view === "grid" ? { aspectRatio: "1 / 1", minWidth: 0 } : { minWidth: 0 }) }}>
              {user && selecting && entry.name !== ".." ? (
                <CardActionArea onClick={() => toggleSelection(relativePath)} sx={sx}
                  aria-label={`选取 ${entry.name}`} aria-pressed={selectedPaths.includes(relativePath)}>
                  <Checkbox checked={selectedPaths.includes(relativePath)} tabIndex={-1}
                    sx={{ position: "absolute", right: 4, top: 4, pointerEvents: "none", zIndex: 1 }} />
                  {content}
                </CardActionArea>
              ) : entry.kind === "folder" ? (
                <CardActionArea component={NextLink} href={entry.url} prefetch={false} sx={sx}>{content}</CardActionArea>
              ) : (
                <CardActionArea onClick={() => {
                  setSelected(entry);
                  setPreviewOpen(true);
                }} sx={sx}>{content}</CardActionArea>
              )}
            </Card></EditableCard></CardReveal>;
          })}
        </Box>
        </CardRevealGroup>
      </Stack>
      {user && operation && <FileDialog operation={operation}
        onClose={() => setOperation(null)}
        onComplete={() => {
          setOperation(null);
          setPreviewOpen(false);
          setSelected(null);
          router.refresh();
        }} />}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullScreen
        aria-labelledby="gallery-preview-title"
        slotProps={{
          transition: { onExited: () => setSelected(null) },
          paper: {
            sx: {
              bgcolor: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
              pointerEvents: "none",
            },
          },
        }}
      >
        <DialogTitle
          id="gallery-preview-title"
          title={selected?.name}
          sx={{
            textAlign: "center",
            flexShrink: 0,
            bgcolor: "rgba(0, 0, 0, 0.6)",
          }}
          noWrap
        >
          {selected?.name}
        </DialogTitle>
        <DialogContent sx={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: 0, gap: 1, p: { xs: 2, sm: 3 },
          "& > *": { pointerEvents: "auto" },
        }}>
          {selected?.kind === "image" && <Box component="img" src={selected.url} alt={selected.name}
            sx={{ display: "block", maxWidth: "100%", maxHeight: "100%", minHeight: 0, objectFit: "contain" }} />}
          {selected?.kind === "video" && <Box component="video" src={selected.url} controls
            sx={{ maxWidth: "100%", maxHeight: "100%", minHeight: 0 }} />}
          {selected?.kind === "audio" && <Box component="audio" src={selected.url} controls
            sx={{ width: "100%", maxWidth: 600 }} />}
          {selected?.kind === "text" && (
            <Box sx={{ width: "100%", maxWidth: 960, maxHeight: "100%", overflow: "auto" }}>
              <TextPreview key={selected.url} url={selected.url} />
            </Box>
          )}
          {selected?.kind === "file" && <Typography>此格式不支持内嵌预览。</Typography>}
          {(selected?.kind === "video" || selected?.kind === "audio") &&
            <Typography variant="caption">媒体能否播放取决于浏览器支持的格式和编码。</Typography>}
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
