import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { createCategory } from "@/lib/cards/categories";
import { CardInputError, parseCategoryName } from "@/features/cards/validation";

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    let payload: unknown;
    try { payload = await request.json(); } catch { throw new CardInputError("请求体不是有效 JSON。"); }
    return NextResponse.json({ category: await createCategory(parseCategoryName(payload)) }, { status: 201 });
  } catch (error) {
    if (error instanceof CardInputError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AuthError) return authFailure(error);
    console.error("Category creation failed:", error);
    return NextResponse.json({ message: "分类保存失败，请检查数据库连接和迁移。" }, { status: 503 });
  }
}
