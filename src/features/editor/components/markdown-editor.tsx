"use client";

import dynamic from "next/dynamic";
import Skeleton from "@mui/material/Skeleton";
import type { MarkdownEditorProps } from "@/features/editor/types";

const VditorEditor = dynamic(
  () => import("./vditor-editor").then((module) => module.VditorEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="markdown-editor-loading" variant="rounded" height={480} />,
  },
);

// Import this wrapper instead of importing the browser-only editor directly.
export function MarkdownEditor(props: MarkdownEditorProps) {
  return <VditorEditor {...props} />;
}