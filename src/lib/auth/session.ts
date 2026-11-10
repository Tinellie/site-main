import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { authLoginLimits, authSessions, authUsers } from "@/db/schema";
import { hashToken } from "@/lib/auth/credentials";
import { AuthError, requireSameOrigin } from "@/lib/auth/http";

export const SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-blog-session"
  : "blog-session";
export const SESSION_SECONDS = 24 * 60 * 60;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [user] = await getDb()
    .select({ id: authUsers.id, username: authUsers.username })
    .from(authSessions)
    .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
    .where(and(
      eq(authSessions.tokenHash, hashToken(token)),
      gt(authSessions.expiresAt, new Date()),
      eq(authUsers.enabled, true),
    ))
    .limit(1);
  return user ?? null;
}

export async function requireEditor() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("登陆过期", 401);
  return user;
}

export async function authorizeWrite(request: Request) {
  const user = await requireEditor();
  requireSameOrigin(request);
  return user;
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  const db = getDb();
  await db.delete(authSessions).where(lte(authSessions.expiresAt, new Date()));
  await db.insert(authSessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function revokeSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await getDb().delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  }
}

export async function consumeLoginAttempt(username: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const blockedUntil = await getDb().transaction(async (tx) => {
    for (const [name, maximum] of [["global", 100], [`account:${username}`, 10]] as const) {
      const key = hashToken(name);
      await tx.insert(authLoginLimits).values({ key, attempts: 1, expiresAt })
        .onDuplicateKeyUpdate({ set: {
          attempts: sql`IF(${authLoginLimits.expiresAt} <= ${now}, 1, LEAST(${authLoginLimits.attempts} + 1, 101))`,
          expiresAt: sql`IF(${authLoginLimits.expiresAt} <= ${now}, ${expiresAt}, ${authLoginLimits.expiresAt})`,
        } });
      const [limit] = await tx.select().from(authLoginLimits).where(eq(authLoginLimits.key, key));
      if (limit.attempts > maximum) return limit.expiresAt;
      if (name === "global") {
        // Lock the shared counter first so concurrent cleanup and inserts serialize.
        await tx.delete(authLoginLimits).where(lte(authLoginLimits.expiresAt, now));
      }
    }
    return null;
  });
  if (blockedUntil) {
    throw new AuthError("登录尝试过于频繁，请稍后重试。", 429,
      Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000)));
  }
}
