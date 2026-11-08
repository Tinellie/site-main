"use client";

import { useEffect, useRef, useState } from "react";

import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import Vditor from "vditor";
import "vditor/dist/index.css";

import type { MarkdownEditorProps } from "@/features/editor/types";

interface HoveredImage {
  src: string;
  relativePath: string;
  top: number;
  left: number;
}

function toAssetRelativePath(src: string): string | null {
  try {
    const url = new URL(src, window.location.origin);
    if (!url.pathname.startsWith("/assets/")) {
      return null;
    }
    const relativePath = decodeURIComponent(url.pathname.slice("/assets/".length));
    const segments = relativePath.split("/");
    if (
      !relativePath ||
      segments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      return null;
    }
    return segments.join("/");
  } catch {
    return null;
  }
}

function normalizeUrlPath(urlLike: string): string {
  try {
    const url = new URL(urlLike, `${window.location.origin}/assets/`);
    return `${url.origin}${decodeURIComponent(url.pathname)}`;
  } catch {
    return decodeURIComponent(urlLike);
  }
}

function replaceImageUrlInMarkdown(
  markdown: string,
  sourceUrl: string,
  targetUrl: string,
): string {
  const sourcePath = normalizeUrlPath(sourceUrl);

  const fromMarkdown = markdown.replaceAll(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (full, altText: string, rawTarget: string) => {
      const target = rawTarget.trim();
      const targetMatch = /^(\S+)(\s+["'][^"']*["'])?$/.exec(target);
      if (!targetMatch) return full;
      const imageUrl = targetMatch[1];
      const suffix = targetMatch[2] ?? "";
      if (normalizeUrlPath(imageUrl) !== sourcePath) return full;
      return `![${altText}](${targetUrl}${suffix})`;
    },
  );

  return fromMarkdown.replaceAll(
    /<img([^>]*?)src=(["'])(.*?)\2([^>]*)>/gi,
    (full, before: string, quote: string, imageUrl: string, after: string) => {
      if (normalizeUrlPath(imageUrl) !== sourcePath) return full;
      return `<img${before}src=${quote}${targetUrl}${quote}${after}>`;
    },
  );
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
