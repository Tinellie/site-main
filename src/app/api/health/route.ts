import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const root = process.cwd();
    await Promise.all([
      getDb().execute(sql`SELECT 1`),
      ...[["content", "blog"], ["content", "blog", "history"], ["public", "assets"], [".next", "cache"]]
        .map(parts => fs.access(path.join(/* turbopackIgnore: true */ root, ...parts), constants.R_OK | constants.W_OK | constants.X_OK)),
      fs.access(path.join(root, ".generated", "mui-icons.json"), constants.R_OK),
    ]);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Deployment readiness check failed:", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
