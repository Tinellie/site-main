import { NextResponse } from "next/server";

import { getNextPostId } from "@/lib/blog/post-store";
import { authFailure } from "@/lib/auth/http";
import { requireEditor } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireEditor();
  } catch (error) {
    return authFailure(error);
  }
  const id = await getNextPostId();
  return NextResponse.json({ id });
}
