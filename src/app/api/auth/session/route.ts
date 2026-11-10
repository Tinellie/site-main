import { NextResponse } from "next/server";

import { authFailure } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    return NextResponse.json({ user: await getCurrentUser() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return authFailure(error);
  }
}
