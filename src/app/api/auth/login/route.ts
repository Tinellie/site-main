import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { authUsers } from "@/db/schema";
import { isValidUsername, normalizeUsername, verifyPassword } from "@/lib/auth/credentials";
import { AuthError, authFailure, readLoginBody, requireSameOrigin } from "@/lib/auth/http";
import {
  consumeLoginAttempt, createSession, revokeSession,
  SESSION_COOKIE, SESSION_SECONDS, sessionCookieOptions,
} from "@/lib/auth/session";

const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readLoginBody(request);
    if (!body || typeof body !== "object" || !("username" in body) ||
      !("password" in body) || typeof body.username !== "string" ||
      typeof body.password !== "string") {
      throw new AuthError("请输入账号和密码。", 400);
    }
    const username = normalizeUsername(body.username);
    if (!isValidUsername(username) || body.password.length < 1 || body.password.length > 128) {
      throw new AuthError("账号或密码错误。", 401);
    }
    await consumeLoginAttempt(username);
    const [user] = await getDb().select().from(authUsers)
      .where(eq(authUsers.username, username)).limit(1);
    const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.enabled || !valid) throw new AuthError("账号或密码错误。", 401);

    await revokeSession();
    const session = await createSession(user.id);
    const response = NextResponse.json(
      { user: { id: user.id, username: user.username } },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...sessionCookieOptions, maxAge: SESSION_SECONDS, expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    return authFailure(error);
  }
}
