import type { Metadata } from "next";

import { LoginPage } from "@/features/auth/login-page";

export const metadata: Metadata = { title: "登录" };

export default function Page() {
  return <LoginPage />;
}
