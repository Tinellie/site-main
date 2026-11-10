"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Add as AddIcon } from "@mui/icons-material";
import { Alert, Fab, Snackbar } from "@mui/material";
import { useAuth } from "@/features/auth/auth-provider";

export function CreatePostFab() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, refresh } = useAuth();
  if (!user) return null;

  async function handleCreate() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/blog/posts/next-id", { method: "GET" });
      if (response.status === 401) {
        await refresh();
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error("创建文章失败：无法获取新 id。");
      }
      const payload = (await response.json()) as { id?: unknown };
      if (!payload || typeof payload.id !== "number") {
        throw new Error("创建文章失败：返回的 id 无效。");
      }
      router.push(`/blog/${payload.id}/edit`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "创建文章失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Fab
      color="primary"
      aria-label="新建文章"
      onClick={handleCreate}
      disabled={loading}
      sx={{
        position: "fixed",
        right: 24,
        bottom: 24,
      }}
    >
      <AddIcon />
    </Fab>
    <Snackbar open={Boolean(error)} onClose={() => setError("")}>
      <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
    </Snackbar>
    </>
  );
}
