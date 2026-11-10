"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Stack, TextField } from "@mui/material";

import { PageTemplate } from "@/components/layout/page-template";
import { useAuth } from "@/features/auth/auth-provider";
import { safeReturnPath } from "@/lib/auth/redirect";

export function LoginPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "登录失败。");
      setPassword("");
      if (!await refresh()) throw new Error("登录后无法确认会话，请重试。");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeReturnPath(next));
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "网络异常，登录失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate title="登录">
      <Stack
        component="form"
        id="login-form"
        spacing={3}
        onSubmit={login}
        sx={{ width: "100%", maxWidth: 360, mx: "auto" }}
      >
        {error && <Alert severity="error">{error}</Alert>}
        {user && <Alert severity="success">当前已登录为 {user.username}。</Alert>}
        <TextField
          id="login-username"
          label="账号"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          slotProps={{ htmlInput: { maxLength: 64 } }}
          fullWidth
        />
        <TextField
          id="login-password"
          label="密码"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          slotProps={{ htmlInput: { maxLength: 128 } }}
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "正在登录…" : "登录"}
        </Button>
      </Stack>
    </PageTemplate>
  );
}
