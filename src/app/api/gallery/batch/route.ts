import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeWrite } from "@/lib/auth/session";
import { AuthError, authFailure } from "@/lib/auth/http";
import { batchAssets, parseBatchInput } from "@/lib/gallery/batch";

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    const text = await request.text();
    if (text.length > 256_000) throw new AuthError("批量请求过大。", 413);
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { throw new AuthError("请求体不是有效 JSON。", 400); }
    const result = await batchAssets(parseBatchInput(payload));
    if (result.completed) {
      revalidatePath("/gallery", "layout");
      revalidatePath("/blog", "layout");
    }
    return NextResponse.json(result, { status: result.completed ? 200 : 409 });
  } catch (error) {
    if (error instanceof AuthError) return authFailure(error);
    console.error("Gallery batch failed:", error);
    return NextResponse.json({ message: "批量操作失败；请检查文件、引用及服务器日志。" }, { status: 503 });
  }
}
