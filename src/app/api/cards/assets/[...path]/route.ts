import { NextResponse } from "next/server";

import { AuthError, authFailure } from "@/lib/auth/http";
import { readCardImage } from "@/lib/cards/assets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const image = await readCardImage(path.join("/"));
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.bytes.byteLength),
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return authFailure(error);
    if (error && typeof error === "object" && "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")) {
      return NextResponse.json({ message: "图片不存在。" }, { status: 404 });
    }
    console.error("Card image read failed:", error);
    return NextResponse.json({ message: "图片读取失败。" }, { status: 500 });
  }
}
