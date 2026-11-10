import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { access, readdir, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createConnection } from "mysql2/promise";

import { hashPassword, hashToken } from "../src/lib/auth/credentials.ts";

const database = process.env.AUTH_TEST_DATABASE_URL;
const base = process.env.AUTH_TEST_BASE_URL;
const origin = process.env.AUTH_TEST_ORIGIN;

test("MySQL authentication protects every write surface", {
  skip: !database || !base || !origin,
}, async (t) => {
  assert.equal(new URL(database).pathname, "/auth_validation", "Only use the isolated test database");
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(database).hostname), "Only use a local database");
  assert.equal(new URL(base).hostname, "127.0.0.1", "Only test a local server");
  const db = await createConnection({ uri: database, timezone: "Z" });
  await db.query("SET time_zone = '+00:00'");
  const username = `test_${randomBytes(8).toString("hex")}`;
  const password = randomBytes(24).toString("hex");
  const postId = 2147000000;
  const postPath = path.resolve("content", "blog", `${postId}.md`);
  const historyPath = path.resolve("content", "blog", "history", String(postId));
  await assert.rejects(access(postPath), { code: "ENOENT" });
  await assert.rejects(access(historyPath), { code: "ENOENT" });
  let uploadedPath;
  let renamedPath;
  let createdPost = false;
  const [insert] = await db.execute(
    "INSERT INTO auth_users (username, password_hash) VALUES (?, ?)",
    [username, await hashPassword(password)],
  );
  const userId = insert.insertId;
  const globalKey = hashToken("global");
  const accountKey = hashToken(`account:${username}`);
  t.after(async () => {
    try {
      await db.execute("DELETE FROM auth_users WHERE id = ?", [userId]);
      await db.execute("DELETE FROM auth_login_limits WHERE limit_key IN (?, ?)", [globalKey, accountKey]);
      if (createdPost) {
        await unlink(postPath);
        for (const file of await readdir(historyPath)) await unlink(path.join(historyPath, file));
        await rmdir(historyPath);
      }
      for (const file of [uploadedPath, renamedPath].filter(Boolean)) {
        try { await unlink(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
    } finally {
      await db.end();
    }
  });

  const request = (url, { method = "GET", cookie, body, requestOrigin = origin, headers = {} } = {}) => (
    fetch(`${base}${url}`, {
      method,
      redirect: "manual",
      headers: {
        Origin: requestOrigin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })
  );
  const login = async (suppliedPassword = password, suppliedUsername = username) => {
    const response = await request("/api/auth/login", {
      method: "POST", body: { username: suppliedUsername, password: suppliedPassword },
    });
    return response;
  };
  const cookieFrom = (response) => response.headers.get("set-cookie").split(";")[0];

  assert.equal((await request("/")).status, 200);
  assert.deepEqual(await (await request("/api/auth/session")).json(), { user: null });
  const guestEdit = await request(`/blog/${postId}/edit`);
  assert.equal(guestEdit.status, 307);
  assert.match(guestEdit.headers.get("location"), /\/login\?next=/);
  for (const [url, method] of [
    [`/api/blog/posts/${postId}`, "PUT"],
    ["/api/blog/assets/upload", "POST"],
    ["/api/blog/assets/rename", "PATCH"],
    ["/api/blog/posts/next-id", "GET"],
  ]) {
    assert.equal((await request(url, { method })).status, 401, url);
  }
  const crossSiteLogin = await request("/api/auth/login", {
    method: "POST", requestOrigin: "https://evil.invalid", body: { username, password },
  });
  assert.equal(crossSiteLogin.status, 403);
  const wrong = await login("incorrect-password");
  const unknown = await login("incorrect-password", `missing_${randomBytes(6).toString("hex")}`);
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());

  const loggedIn = await login();
  assert.equal(loggedIn.status, 200, await loggedIn.clone().text());
  const setCookie = loggedIn.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Max-Age=86400/i);
  let cookie = cookieFrom(loggedIn);
  const token = cookie.split("=")[1];
  const [sessions] = await db.execute("SELECT token_hash FROM auth_sessions WHERE user_id = ?", [userId]);
  assert.equal(sessions[0].token_hash, hashToken(token));
  assert.notEqual(sessions[0].token_hash, token);
  assert.equal((await (await request("/api/auth/session", { cookie })).json()).user.username, username);
  assert.equal((await request(`/blog/${postId}/edit`, { cookie })).status, 200);

  for (const [url, method] of [
    [`/api/blog/posts/${postId}`, "PUT"],
    ["/api/blog/assets/upload", "POST"],
    ["/api/blog/assets/rename", "PATCH"],
    ["/api/auth/logout", "POST"],
  ]) {
    assert.equal((await request(url, { method, cookie, requestOrigin: "https://evil.invalid" })).status, 403, url);
    assert.equal((await request(url, { method, cookie, requestOrigin: "" })).status, 403, url);
  }
  assert.equal((await request("/api/blog/posts/next-id", { cookie })).status, 200);
  const content = { title: "Authentication test", coverImage: "", tags: [], content: "Test content" };
  assert.equal((await request(`/api/blog/posts/${postId}`, { method: "PUT", cookie, body: content })).status, 200);
  createdPost = true;
  assert.equal((await request(`/api/blog/posts/${postId}`, {
    method: "PUT", cookie, body: { ...content, content: "Updated content" },
  })).status, 200);
  assert.equal((await (await request(`/api/blog/posts/${postId}`)).json()).content, "Updated content\n");

  const form = new FormData();
  form.set("file", new Blob([Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
    "base64",
  )], { type: "image/png" }), `${username}.png`);
  const upload = await request("/api/blog/assets/upload", { method: "POST", cookie, body: form });
  assert.equal(upload.status, 200);
  const result = await upload.json();
  assert.equal(result.code, 0);
  const sourcePath = Object.values(result.data.succMap)[0];
  uploadedPath = path.resolve("public", "assets", sourcePath);
  const targetPath = `${username}-renamed.png`;
  renamedPath = path.resolve("public", "assets", targetPath);
  assert.equal((await request("/api/blog/assets/rename", {
    method: "PATCH", cookie, body: { sourcePath, targetPath },
  })).status, 200);
  await access(renamedPath);
  assert.equal((await request("/api/auth/logout", { method: "POST", cookie })).status, 200);
  assert.equal((await request(`/api/blog/posts/${postId}`, { method: "PUT", cookie, body: content })).status, 401);

  cookie = cookieFrom(await login());
  await db.execute("UPDATE auth_sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE user_id = ?", [userId]);
  assert.deepEqual(await (await request("/api/auth/session", { cookie })).json(), { user: null });
  assert.equal((await request("/api/blog/assets/rename", { method: "PATCH", cookie })).status, 401);
  cookie = cookieFrom(await login());
  await db.execute("UPDATE auth_users SET enabled = false WHERE id = ?", [userId]);
  assert.equal((await request("/api/blog/posts/next-id", { cookie })).status, 401);
  await db.execute("UPDATE auth_users SET enabled = true WHERE id = ?", [userId]);

  await db.execute("DELETE FROM auth_login_limits WHERE limit_key = ?", [accountKey]);
  const attempts = await Promise.all(Array.from({ length: 11 }, () => login("incorrect-password")));
  assert.equal(attempts.filter(response => response.status === 401).length, 10);
  const blocked = attempts.find(response => response.status === 429);
  assert.ok(blocked);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal((await login()).status, 429);
  await db.execute("UPDATE auth_login_limits SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE limit_key = ?", [accountKey]);
  assert.equal((await login()).status, 200);
});
