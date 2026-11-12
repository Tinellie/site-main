import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { deleteCard, moveCard, saveCard } from "@/lib/cards/store";
import { CardInputError, parseCardInput, parseCardMove } from "@/features/cards/validation";

async function mutate(request: Request, context: RouteContext<"/api/cards/[id]">, remove: boolean) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  const { id: rawId } = await context.params;
  if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) {
    return NextResponse.json({ message: "卡片编号无效。" }, { status: 400 });
  }
  try {
    if (remove) {
      await deleteCard(Number(rawId));
      return NextResponse.json({ deleted: true });
    }
    let payload: unknown;
    try { payload = await request.json(); } catch { throw new CardInputError("请求体不是有效 JSON。"); }
    if (payload && typeof payload === "object" && "direction" in payload) {
      return NextResponse.json({ cards: await moveCard(Number(rawId), parseCardMove(payload)) });
    }
    return NextResponse.json({ card: await saveCard(parseCardInput(payload), Number(rawId)) });
  } catch (error) {
    if (error instanceof CardInputError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AuthError) return authFailure(error);
    console.error("Card mutation failed:", error);
    return NextResponse.json({ message: "操作失败，请检查数据库连接和迁移。" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/cards/[id]">) {
  return mutate(request, context, false);
}

export async function DELETE(request: Request, context: RouteContext<"/api/cards/[id]">) {
  return mutate(request, context, true);
}
