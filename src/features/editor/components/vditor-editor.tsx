"use client";

import { useEffect, useRef } from "react";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

import Vditor from "vditor";
// Vditor's own stylesheet is required; application styles live in MUI theme/sx.
import "vditor/dist/index.css";

import type { MarkdownEditorProps } from "@/features/editor/types";

export function VditorEditor({
  initialValue = "",
  onChange,
  uploadUrl,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    let active = true;
    let ready = false;

    // Give each mount its own node, including React Strict Mode remounts.
    const element = document.createElement("div");
    element.className = "ve-instance";
    containerRef.current.appendChild(element);

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
        // Initialization loads assets asynchronously; handle unmounts meanwhile.
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
        markdown: { sanitize: true },
        theme: { current: darkMode ? "dark" : "light" },
      },
      ...(uploadUrl ? { upload: { url: uploadUrl, accept: "image/*" } } : {}),
    });

    return () => {
      active = false;
      if (ready) {
        initialValueRef.current = editor.getValue();
        editor.destroy();
      }
      element.remove();
    };
  }, [darkMode, uploadUrl]);

  return (
    <Box className="markdown-editor">
      <div className="me-mount" ref={containerRef} />
    </Box>
  );
}