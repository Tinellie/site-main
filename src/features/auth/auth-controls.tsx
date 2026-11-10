"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Alert, Button, Stack, Typography } from "@mui/material";

import { useAuth } from "@/features/auth/auth-provider";

export function AuthControls() {
  const { user, loading, error, refresh } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "退出登录失败。");
      await refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "退出登录失败。");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Stack spacing={1}>
      {(error || logoutError) && (
        <Alert severity="error" action={error ? (
          <Button color="inherit" size="small" onClick={() => void refresh()}>重试</Button>
        ) : undefined}>
          {logoutError || error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {user ? (
          <>
            <Typography variant="caption" color="text.secondary">{user.username}</Typography>
            <Button size="small" onClick={logout} disabled={loggingOut}>
              {loggingOut ? "正在注销…" : "注销"}
            </Button>
          </>
        ) : (
          <Button component={NextLink} href="/login" size="small"
            disabled={loading} sx={{ color: "text.secondary" }}>
            登录
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
