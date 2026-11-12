import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { MAX_CARD_IMAGE_BYTES, moveCardImage, uploadCardImage } from "@/lib/cards/assets";

function failure(error: unknown) {
  if (error instanceof AuthError) return authFailure(error);
  console.error("Card image operation failed:", error);
  return NextResponse.json({ message: "图片操作失败，请检查路径与服务器存储权限。" }, { status: 500 });
}

async function uploadForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("请选择图片。", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_CARD_IMAGE_BYTES + 65536) {
        await reader.cancel();
        throw new AuthError("图片请求过大。", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch { throw new AuthError("上传表单无效。", 400); }
}

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  if (Number(request.headers.get("content-length")) > MAX_CARD_IMAGE_BYTES + 65536) {
    return NextResponse.json({ message: "图片请求过大。" }, { status: 413 });
  }
  try {
    const form = await uploadForm(request);
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
    return NextResponse.json({ image: await moveCardImage(body.source, body.target) });
  } catch (error) { return failure(error); }
}
