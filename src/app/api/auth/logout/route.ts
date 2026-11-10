import { NextResponse } from "next/server";

import { authFailure, requireSameOrigin } from "@/lib/auth/http";
import { revokeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await revokeSession();
    const response = NextResponse.json({ message: "已退出登录。" }, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return authFailure(error);
  }
}
