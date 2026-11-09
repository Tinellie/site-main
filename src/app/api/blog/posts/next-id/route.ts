import { NextResponse } from "next/server";

import { getNextPostId } from "@/lib/blog/post-store";

export async function GET() {
  const id = await getNextPostId();
  return NextResponse.json({ id });
}
