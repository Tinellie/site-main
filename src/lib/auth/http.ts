import "server-only";

import { NextResponse } from "next/server";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function requireSameOrigin(request: Request): void {
  const configured = process.env.AUTH_ORIGIN;
  if (!configured) throw new Error("请配置 AUTH_ORIGIN。");
  const origin = new URL(configured);
  if (origin.origin !== configured ||
    (process.env.NODE_ENV === "production" && origin.protocol !== "https:")) {
    throw new Error("AUTH_ORIGIN 必须为不带路径的站点来源，生产环境必须使用 HTTPS。");
  }
  if (request.headers.get("origin") !== origin.origin ||
    request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AuthError("请求来源无效，请从本站页面重试。", 403);
  }
}

export function authFailure(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { message: error.message, code: 1, msg: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
        },
      },
    );
  }
  console.error("Authentication service failed:", error);
  return NextResponse.json(
    { message: "认证服务暂不可用，请检查服务器配置后重试。", code: 1, msg: "认证服务暂不可用。" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function readLoginBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AuthError("登录请求必须使用 JSON。", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("缺少登录信息。", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        throw new AuthError("登录请求过大。", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AuthError("登录信息格式无效。", 400);
  }
}
