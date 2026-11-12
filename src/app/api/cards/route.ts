import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/auth/session";
import { authFailure, AuthError } from "@/lib/auth/http";
import { listCards, saveCard } from "@/lib/cards/store";
import { listCategories } from "@/lib/cards/categories";
import { CardInputError, parseCardInput } from "@/features/cards/validation";
import { readCardSubmission } from "@/lib/cards/submission";

export async function GET(request: Request) {
  const section = new URL(request.url).searchParams.get("section");
  if (section !== "connect" && section !== "works") {
    return NextResponse.json({ message: "页面类型无效。" }, { status: 400 });
  }
  try {
    const [cards, categories] = await Promise.all([
      listCards(section), section === "connect" ? listCategories() : Promise.resolve([]),
    ]);
    return NextResponse.json({ cards, categories }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Card listing failed:", error);
    return NextResponse.json({ message: "卡片加载失败，请检查数据库迁移。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try { await authorizeWrite(request); } catch (error) { return authFailure(error); }
  try {
    const { payload, file } = await readCardSubmission(request);
    const card = await saveCard(parseCardInput(payload), undefined, file);
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof CardInputError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AuthError) return authFailure(error);
    console.error("Card creation failed:", error);
    return NextResponse.json({ message: "保存失败，请检查数据库连接和迁移。" }, { status: 503 });
  }
}
