import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { MAX_CARD_IMAGE_BYTES, moveCardImage, uploadCardImage } from "@/lib/cards/assets";
import { readImageUploadForm } from "@/lib/images/upload-form";
import { revalidatePath } from "next/cache";

function failure(error: unknown) {
  if (error instanceof AuthError) return authFailure(error);
  console.error("Card image operation failed:", error);
  return NextResponse.json({ message: "图片操作失败，请检查路径与服务器存储权限。" }, { status: 500 });
}

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  if (Number(request.headers.get("content-length")) > MAX_CARD_IMAGE_BYTES + 65536) {
    return NextResponse.json({ message: "图片请求过大。" }, { status: 413 });
  }
  try {
    const form = await readImageUploadForm(request);
    const file = form.get("file");
    if (!(file instanceof File)) throw new AuthError("请选择图片。", 400);
    return NextResponse.json({ image: await uploadCardImage(file) });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new AuthError("请求体不是有效 JSON。", 400); }
    if (!body || typeof body !== "object" || !("source" in body) || !("target" in body) ||
      typeof body.source !== "string" || typeof body.target !== "string") {
      throw new AuthError("请提供原路径和目标路径。", 400);
    }
    const image = await moveCardImage(body.source, body.target);
    revalidatePath("/blog", "layout");
    revalidatePath("/gallery", "layout");
    return NextResponse.json({ image });
  } catch (error) { return failure(error); }
}
