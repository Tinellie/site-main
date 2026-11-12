import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { authorizeWrite, requireEditor } from "@/lib/auth/session";
import { AuthError, authFailure } from "@/lib/auth/http";
import { readImageUploadForm } from "@/lib/images/upload-form";
import { deleteManagedAsset, inspectManagedAsset, managedAssetUsage, moveManagedAsset, uploadManagedAsset } from "@/lib/gallery/file-manager";

function failure(error: unknown) {
  if (error instanceof AuthError) return authFailure(error);
  console.error("Gallery file operation failed:", error);
  return NextResponse.json({ message: "文件操作失败，请检查数据库迁移及存储权限。" }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    await requireEditor();
    const query = new URL(request.url).searchParams;
    if (query.get("action") === "references") {
      return NextResponse.json({ usage: await managedAssetUsage(query.get("path")) }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(await inspectManagedAsset(query.get("path"), query.get("action") === "suggest"),
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    const form = await readImageUploadForm(request);
    const file = form.get("file");
    if (!(file instanceof File)) throw new AuthError("请选择图片。", 400);
    const relative = await uploadManagedAsset(file, form.get("path"));
    revalidatePath("/gallery", "layout");
    return NextResponse.json({ path: relative }, { status: 201 });
  } catch (error) { return failure(error); }
}

async function mutate(request: Request, remove: boolean) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new AuthError("请求体不是有效 JSON。", 400); }
    if (!body || typeof body !== "object" || !("path" in body)) throw new AuthError("缺少 Path。", 400);
    if (remove) {
      const result = await deleteManagedAsset(body.path, "confirmReferences" in body && body.confirmReferences === true);
      if (result.deleted) revalidatePath("/gallery", "layout");
      return NextResponse.json(result, { status: result.deleted ? 200 : 409 });
    }
    if (!("target" in body)) throw new AuthError("缺少目标 Path。", 400);
    const relative = await moveManagedAsset(body.path, body.target);
    revalidatePath("/gallery", "layout");
    revalidatePath("/blog", "layout");
    return NextResponse.json({ path: relative });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) { return mutate(request, false); }
export async function DELETE(request: Request) { return mutate(request, true); }
