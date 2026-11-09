"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, Button, Stack, TextField } from "@mui/material";

import { PageTemplate } from "@/components/layout/page-template";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import type { BlogPost } from "@/features/blog/types";

interface PostEditorPageProps {
  id: number;
  initialPost: BlogPost | null;
}

function inferTitleFromMarkdown(markdown: string): string {
  const firstLine = markdown
    .replaceAll(/\r\n?/g, "\n")
    .split("\n")
    .find((line) => line.trim());

  if (!firstLine) return "";

  return firstLine
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s*/, "")
    .slice(0, 120)
    .trim();
}

function toCoverInputValue(coverImage: string): string {
  if (!coverImage) return "";
  if (coverImage.startsWith("/assets/")) return coverImage.slice("/assets/".length);
  if (coverImage.startsWith("/images/assets/")) {
    return coverImage.slice("/images/assets/".length);
  }
  if (coverImage.startsWith("assets/")) return coverImage.slice("assets/".length);
  return coverImage;
}

export function PostEditorPage({ id, initialPost }: PostEditorPageProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [hasManuallySetTitle, setHasManuallySetTitle] = useState(
    Boolean(initialPost?.title.trim()),
  );
  const [coverImage, setCoverImage] = useState(
    toCoverInputValue(initialPost?.coverImage ?? ""),
  );
  const [tagsText, setTagsText] = useState((initialPost?.tags ?? []).join(", "));
  const [content, setContent] = useState(initialPost?.content ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const editorKey = useMemo(() => `${id}:${initialPost?.updatedAt ?? "new"}`, [id, initialPost?.updatedAt]);

  async function renameImage(sourcePath: string, targetPath: string): Promise<string> {
    const response = await fetch("/api/blog/assets/rename", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath, targetPath }),
    });
    const payload = (await response.json()) as { url?: unknown; message?: unknown };
    if (!response.ok || typeof payload.url !== "string") {
      throw new Error(
        typeof payload.message === "string" ? payload.message : "修改图片路径失败。",
      );
    }
    return payload.url;
  }

  async function handleSave() {
    if (saving) return;
    if (!title.trim()) {
      setError("标题不能为空。");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/blog/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          coverImage,
          tags: tagsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          content,
        }),
      });
      const payload = (await response.json()) as { message?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string" ? payload.message : "保存文章失败。",
        );
      }
      router.push(`/blog/${id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存文章失败。");
    } finally {
      setSaving(false);
    }
  }

  function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    setHasManuallySetTitle(true);
  }

  function handleEditorChange(nextMarkdown: string) {
    setContent(nextMarkdown);
    if (!hasManuallySetTitle) {
      setTitle(inferTitleFromMarkdown(nextMarkdown));
    }
  }

  return (
    <PageTemplate title={`编辑文章 #${id}`}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="标题"
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          required
          fullWidth
        />
        <MarkdownEditor
          key={editorKey}
          initialValue={content}
          onChange={handleEditorChange}
          uploadUrl="/api/blog/assets/upload"
          onRenameImage={renameImage}
        />
        <TextField
          label="封面图"
          value={coverImage}
          onChange={(event) => setCoverImage(event.target.value)}
          helperText="留空表示无封面；输入 $$ 在保存时采用正文第一张图片（无图片则留空）。也可填写相对路径，如 covers/post.png。"
          fullWidth
        />
        <TextField
          label="标签"
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          helperText="可留空；多个标签使用英文逗号分隔。"
          fullWidth
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            保存文章
          </Button>
        </Stack>
      </Stack>
    </PageTemplate>
  );
}
