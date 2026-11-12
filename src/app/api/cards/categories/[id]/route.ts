import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { mutateCategory } from "@/lib/cards/categories";
import { CardInputError, parseCategoryMutation } from "@/features/cards/validation";
import type { CategoryMutation } from "@/features/cards/types";

async function mutate(request: Request, context: RouteContext<"/api/cards/categories/[id]">, remove: boolean) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    return NextResponse.json({ message: "分类编号无效。" }, { status: 400 });
  }
  try {
    let mutation: CategoryMutation | undefined;
    if (!remove) {
      let payload: unknown;
      try { payload = await request.json(); } catch { throw new CardInputError("请求体不是有效 JSON。"); }
      mutation = parseCategoryMutation(payload);
    }
    return NextResponse.json({ categories: await mutateCategory(Number(id), mutation) });
  } catch (error) {
    if (error instanceof CardInputError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AuthError) return authFailure(error);
    console.error("Category mutation failed:", error);
    return NextResponse.json({ message: "分类操作失败，请检查数据库连接和迁移。" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/cards/categories/[id]">) {
  return mutate(request, context, false);
}

export async function DELETE(request: Request, context: RouteContext<"/api/cards/categories/[id]">) {
  return mutate(request, context, true);
}
