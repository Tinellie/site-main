import { NextResponse } from "next/server";

import { renameAssetFile } from "@/lib/blog/post-store";
import { authFailure } from "@/lib/auth/http";
import { authorizeWrite } from "@/lib/auth/session";

export async function PATCH(request: Request) {
  try {
    await authorizeWrite(request);
  } catch (error) {
    return authFailure(error);
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "请求体不是有效 JSON。" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "请求体格式错误。" }, { status: 400 });
  }

  const body = payload as {
    sourcePath?: unknown;
    targetPath?: unknown;
  };

  if (typeof body.sourcePath !== "string" || typeof body.targetPath !== "string") {
    return NextResponse.json({ message: "路径字段必须为字符串。" }, { status: 400 });
  }

  try {
    const url = await renameAssetFile(body.sourcePath, body.targetPath);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "重命名失败。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
