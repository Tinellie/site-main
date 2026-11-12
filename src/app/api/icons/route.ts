import { NextResponse } from "next/server";
import { getMuiIconNames } from "@/lib/cards/icons";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").slice(0, 100).toLowerCase();
  const offset = Number(params.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return NextResponse.json({ message: "图标分页参数无效。" }, { status: 400 });
  }
  try {
    const matches = (await getMuiIconNames()).filter(name => name.toLowerCase().includes(query));
    return NextResponse.json({ names: matches.slice(offset, offset + 60), total: matches.length });
  } catch (error) {
    console.error("Icon catalog failed:", error);
    return NextResponse.json({ message: "图标库加载失败。" }, { status: 503 });
  }
}
