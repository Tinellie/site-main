"use client";

import { useEffect, useRef, useState } from "react";

import { Edit as EditIcon } from "@mui/icons-material";
import {
  Box,
  Button, IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";

import Vditor from "vditor";
import "vditor/dist/index.css";

import type { MarkdownEditorProps } from "@/features/editor/types";
import { assetReferencePath } from "@/features/gallery/asset-path";
import { rewriteMarkdownImages, unescapeImageUrl } from "@/lib/images/markdown-images";

interface HoveredImage {
  src: string;
  relativePath: string;
  top: number;
  left: number;
}

function toAssetRelativePath(src: string): string | null {
  return assetReferencePath(src, window.location.origin);
}

function replaceImageUrlInMarkdown(
  markdown: string,
  sourceUrl: string,
  targetUrl: string,
): string {
  const sourcePath = toAssetRelativePath(sourceUrl)?.toLowerCase();
  return rewriteMarkdownImages(markdown, url =>
    sourcePath && toAssetRelativePath(unescapeImageUrl(url))?.toLowerCase() === sourcePath
      ? targetUrl + (url.match(/[?#].*$/)?.[0] ?? "") : null);
}

export function VditorEditor({
  initialValue = "",
  onChange,
  uploadUrl,
  onRenameImage,
}: MarkdownEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);
  const editorRef = useRef<Vditor | null>(null);
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";

  const [hoveredImage, setHoveredImage] = useState<HoveredImage | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renamePath, setRenamePath] = useState("");
  const [renameError, setRenameError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    let active = true;
    let ready = false;

    const element = document.createElement("div");
    element.className = "ve-instance";
    mountNode.appendChild(element);

    const editor = new Vditor(element, {
      value: initialValueRef.current,
      minHeight: 480,
      mode: "ir",
      lang: "zh_CN",
      theme: darkMode ? "dark" : "classic",
      cache: { enable: false },
      input: (markdown) => {
        if (active) {
          initialValueRef.current = markdown;
          onChangeRef.current?.(markdown);
        }
      },
      after: () => {
        ready = true;
        if (!active) editor.destroy();
      },
      toolbar: [
        "headings", "bold", "italic", "strike", "|",
        "list", "ordered-list", "check", "quote", "|",
        "code", "inline-code", "link", "table",
        ...(uploadUrl ? ["upload"] : []),
        "|", "undo", "redo", "edit-mode", "fullscreen",
      ],
      preview: {
        markdown: { sanitize: true, linkBase: "/assets/" },
        theme: { current: darkMode ? "dark" : "light" },
      },
      ...(uploadUrl
        ? {
            upload: {
              url: uploadUrl,
              accept: "image/*",
              filename: () => `image-${Date.now()}`,
            },
          }
        : {}),
    });

    editorRef.current = editor;

    return () => {
      active = false;
      if (ready) {
        initialValueRef.current = editor.getValue();
        editor.destroy();
      }
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
      element.remove();
    };
  }, [darkMode, uploadUrl]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onRenameImage) return;
    const wrapperElement = wrapper;

    function updateHoveredImage(target: EventTarget | null) {
      if (target instanceof Element && target.closest(".ve-image-edit-button")) {
        return;
      }
      const image = target instanceof Element ? target.closest("img") : null;
      if (!(image instanceof HTMLImageElement)) {
        if (!panelOpen) setHoveredImage(null);
        return;
      }

      const relativePath = toAssetRelativePath(image.currentSrc || image.src);
      if (!relativePath) {
        if (!panelOpen) setHoveredImage(null);
        return;
      }

      const wrapperRect = wrapperElement.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      setHoveredImage({
        src: image.currentSrc || image.src,
        relativePath,
        top: imageRect.bottom - wrapperRect.top - 32,
        left: imageRect.right - wrapperRect.left - 32,
      });
    }

    const onPointerMove = (event: PointerEvent) => updateHoveredImage(event.target);
    const onLeave = () => {
      if (!panelOpen) setHoveredImage(null);
    };

    wrapperElement.addEventListener("pointermove", onPointerMove);
    wrapperElement.addEventListener("mouseleave", onLeave);

    return () => {
      wrapperElement.removeEventListener("pointermove", onPointerMove);
      wrapperElement.removeEventListener("mouseleave", onLeave);
    };
  }, [onRenameImage, panelOpen]);

  function openRenamePanel() {
    if (!hoveredImage) return;
    setRenamePath(hoveredImage.relativePath);
    setRenameError("");
    setPanelOpen(true);
  }

  function closeRenamePanel() {
    if (renaming) return;
    setPanelOpen(false);
    setRenameError("");
  }

  async function submitRename() {
    if (!onRenameImage || !hoveredImage) return;
    const targetPath = renamePath.trim();
    if (!targetPath) {
      setRenameError("图片名称不能为空。");
      return;
    }

    setRenaming(true);
    setRenameError("");

    try {
      const nextUrl = await onRenameImage(hoveredImage.relativePath, targetPath);
      const editor = editorRef.current;
      if (!editor) return;
      const currentMarkdown = editor.getValue();
      const nextMarkdown = replaceImageUrlInMarkdown(
        currentMarkdown,
        hoveredImage.src,
        nextUrl.startsWith("/assets/") ? nextUrl.slice("/assets/".length) : nextUrl,
      );
      editor.setValue(nextMarkdown);
      initialValueRef.current = nextMarkdown;
      onChangeRef.current?.(nextMarkdown);
      setPanelOpen(false);
      setHoveredImage((current) => {
        if (!current) return null;
        return { ...current, src: nextUrl, relativePath: targetPath };
      });
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : "重命名图片失败。");
    } finally {
      setRenaming(false);
    }
  }

  return (
    <Box className="markdown-editor" sx={{ position: "relative" }} ref={wrapperRef}>
      <div className="me-mount" ref={mountRef} />
      {onRenameImage && hoveredImage && (
        <IconButton
          className="ve-image-edit-button"
          aria-label="编辑图片路径"
          size="small"
          color="primary"
          onClick={openRenamePanel}
          sx={{
            position: "absolute",
            top: hoveredImage.top,
            left: hoveredImage.left,
            width: 28,
            height: 28,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <EditIcon fontSize="inherit" />
        </IconButton>
      )}
      <Popover
        open={panelOpen}
        onClose={closeRenamePanel}
        anchorReference="anchorPosition"
        anchorPosition={
          hoveredImage
            ? { top: Math.max(0, Math.round(hoveredImage.top + 64)), left: Math.max(0, Math.round(hoveredImage.left + 64)) }
            : undefined
        }
      >
        <Stack spacing={1.5} sx={{ p: 2, width: 320 }}>
          <Typography variant="subtitle2">编辑图片路径</Typography>
          <TextField
            label="相对 assets 的路径"
            size="small"
            value={renamePath}
            onChange={(event) => setRenamePath(event.target.value)}
            error={Boolean(renameError)}
            helperText={renameError || "例如：covers/2026/post-image.png"}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={closeRenamePanel} disabled={renaming}>
              取消
            </Button>
            <Button variant="contained" onClick={submitRename} disabled={renaming}>
              保存
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </Box>
  );
}
