import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { listCards, saveCard } from "@/lib/cards/store";
import { CardInputError, parseCardInput } from "@/features/cards/validation";

export async function GET(request: Request) {
  const section = new URL(request.url).searchParams.get("section");
  if (section !== "connect" && section !== "works") {
    return NextResponse.json({ message: "页面类型无效。" }, { status: 400 });
  }
  try {
    return NextResponse.json({ cards: await listCards(section) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Card listing failed:", error);
    return NextResponse.json({ message: "卡片加载失败，请检查数据库迁移。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    let payload: unknown;
    try { payload = await request.json(); } catch { throw new CardInputError("请求体不是有效 JSON。"); }
    const card = await saveCard(parseCardInput(payload));
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof CardInputError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AuthError) return authFailure(error);
    console.error("Card creation failed:", error);
    return NextResponse.json({ message: "保存失败，请检查数据库连接和迁移。" }, { status: 503 });
  }
}
