import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import mysql from "mysql2/promise";
import { hashPassword } from "../src/lib/auth/credentials.ts";

const database = process.env.CARDS_TEST_DATABASE_URL;
const base = process.env.CARDS_TEST_BASE_URL;
const origin = process.env.CARDS_TEST_ORIGIN;
const assetRoot = process.env.CARDS_TEST_ASSET_ROOT;

test("cards persist in MySQL with authenticated CRUD, icon search and image moves", {
  skip: !database || !base || !origin || !assetRoot,
}, async () => {
  const url = new URL(database);
  assert.equal(url.pathname, "/auth_validation");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  assert.ok(path.isAbsolute(assetRoot));
  const db = await mysql.createConnection(database);
  const username = `cards_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const password = "cards-test-password-123";
  const ids = [];
  const files = [];
  let userId;
  let cookie = "";
  const request = (route, method = "GET", body, authenticated = true, source = origin) => fetch(`${base}${route}`, {
    method,
    headers: {
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET" ? { Origin: source } : {}),
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const input = { kind: "connect", title: "Cards integration", username: "test", link: "https://example.com", image: "", icon: "GitHub", description: "" };
  try {
    const [user] = await db.execute("INSERT INTO auth_users (username,password_hash) VALUES (?,?)", [username, await hashPassword(password)]);
    userId = user.insertId;
    for (const [route, method, body] of [
      ["/api/cards", "POST", input], ["/api/cards/1", "PATCH", input],
      ["/api/cards/1", "DELETE"], ["/api/cards/assets", "POST"], ["/api/cards/assets", "PATCH", {}],
    ]) assert.equal((await request(route, method, body, false)).status, 401);
    const listing = await request("/api/cards?section=connect", "GET", undefined, false);
    assert.equal(listing.status, 200);
    assert.ok(Array.isArray((await listing.json()).cards));
    const login = await request("/api/auth/login", "POST", { username, password }, false);
    assert.equal(login.status, 200, await login.text());
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/api/cards", "POST", input, true, "https://evil.invalid")).status, 403);
    assert.equal((await request("/api/cards", "POST", { ...input, link: "javascript:alert(1)" })).status, 400);
    assert.equal((await request("/api/cards", "POST", { ...input, image: "../bad.png" })).status, 400);
    assert.equal((await request("/api/cards", "POST", { ...input, icon: "DefinitelyNotAMuiIcon123" })).status, 400);
    for (const kind of ["connect", "project", "article"]) {
      const created = await request("/api/cards", "POST", { ...input, kind });
      assert.equal(created.status, 201);
      const { card } = await created.json();
      ids.push(card.id);
      const [rows] = await db.execute("SELECT title,kind FROM content_cards WHERE id=?", [card.id]);
      assert.equal(rows[0].kind, kind);
      assert.equal(rows[0].title, input.title);
      const updated = await request(`/api/cards/${card.id}`, "PATCH", { ...input, kind, title: "Updated" });
      assert.equal(updated.status, 200);
      assert.equal((await updated.json()).card.title, "Updated");
    }
    assert.equal((await request(`/api/cards/${ids[0]}`, "PATCH", { ...input, kind: "article" })).status, 400);
    const converted = await request(`/api/cards/${ids[1]}`, "PATCH", { ...input, kind: "article" });
    assert.equal(converted.status, 200);
    const catalog = await request("/api/icons?q=GitHub");
    assert.ok((await catalog.json()).names.includes("GitHub"));
    const all = await request("/api/icons");
    const firstPage = await all.json();
    assert.ok(firstPage.total > 10000);
    assert.equal(firstPage.names.length, 60);
    const secondPage = await (await request("/api/icons?offset=60")).json();
    assert.equal(secondPage.names.length, 60);
    assert.ok(!firstPage.names.includes(secondPage.names[0]));
    for (const offset of ["-1", "NaN", "Infinity", "0.5"]) {
      assert.equal((await request(`/api/icons?offset=${offset}`)).status, 400);
    }
    const svg = await request("/api/icons/GitHub");
    assert.equal(svg.status, 200);
    const markup = await svg.text();
    assert.match(markup, /^<svg fill="#ffffff"/);
    assert.match(markup, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.equal((await request("/api/icons/NotAnIcon123")).status, 404);
    const invalidImage = new FormData();
    invalidImage.set("file", new File(["not-an-image"], "bad.png", { type: "image/png" }));
    assert.equal((await request("/api/cards/assets", "POST", invalidImage)).status, 400);
    const tooLarge = new FormData();
    tooLarge.set("file", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }));
    assert.equal((await request("/api/cards/assets", "POST", tooLarge)).status, 400);
    const oversizedStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 65537));
        controller.close();
      },
    });
    const streamResponse = await fetch(`${base}/api/cards/assets`, {
      method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "multipart/form-data; boundary=cards-test" },
      body: oversizedStream, duplex: "half",
    });
    assert.equal(streamResponse.status, 413);
    const form = new FormData();
    form.set("file", new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0c0AAAAASUVORK5CYII=", "base64")], "test.png", { type: "image/png" }));
    const upload = await request("/api/cards/assets", "POST", form);
    assert.equal(upload.status, 200);
    const { image } = await upload.json();
    files.push(image);
    assert.match(image, /^test-[a-f0-9-]+\.png$/);
    const uploadedImage = await request(`/api/cards/assets/${image}`, "GET", undefined, false);
    assert.equal(uploadedImage.status, 200);
    assert.equal(uploadedImage.headers.get("content-type"), "image/png");
    const target = `cards-validation-${randomUUID()}/renamed.png`;
    const moved = await request("/api/cards/assets", "PATCH", { source: image, target });
    assert.equal(moved.status, 200);
    files.push(target);
    assert.equal((await moved.json()).image, target);
    assert.equal((await request(`/api/cards/assets/${target}`, "GET", undefined, false)).status, 200);
    assert.equal((await request(`/api/cards/assets/${image}`, "GET", undefined, false)).status, 404);
    assert.equal((await request("/api/cards/assets", "PATCH", { source: target, target: "../bad.png" })).status, 400);
    const targetFile = path.join(assetRoot, target);
    await fs.access(targetFile);
    await assert.rejects(fs.access(path.join(assetRoot, image)));
    const conflict = `cards-validation-${randomUUID()}.png`;
    files.push(conflict);
    await fs.writeFile(path.join(assetRoot, conflict), "keep-original");
    assert.equal((await request("/api/cards/assets", "PATCH", { source: target, target: conflict })).status, 409);
    assert.equal(await fs.readFile(path.join(assetRoot, conflict), "utf8"), "keep-original");
    assert.equal((await request(`/api/cards/${ids[0]}`, "PATCH", { ...input, image: target })).status, 200);
    for (const id of ids) {
      assert.equal((await request(`/api/cards/${id}`, "DELETE")).status, 200);
      assert.equal((await request(`/api/cards/${id}`, "DELETE")).status, 404);
    }
    const [remaining] = await db.execute(`SELECT id FROM content_cards WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    assert.equal(remaining.length, 0);
    await fs.access(targetFile);
    const token = cookie.slice(cookie.indexOf("=") + 1);
    await db.execute("DELETE FROM auth_sessions WHERE token_hash=?", [createHash("sha256").update(token).digest("hex")]);
    assert.equal((await request("/api/cards", "POST", input)).status, 401);
    console.log("Verified guest reads, five guarded mutations, CSRF, all card kinds, type change, MySQL persistence, 10k+ icons, upload/move and no-overwrite.");
  } finally {
    for (const id of ids) await db.execute("DELETE FROM content_cards WHERE id=?", [id]);
    if (userId) await db.execute("DELETE FROM auth_users WHERE id=?", [userId]);
    await db.end();
    if (process.env.CARDS_TEST_ASSET_ROOT) {
      for (const file of files) {
        await fs.rm(path.join(process.env.CARDS_TEST_ASSET_ROOT, file), { force: true });
        if (file.includes("/")) await fs.rmdir(path.dirname(path.join(process.env.CARDS_TEST_ASSET_ROOT, file)));
      }
    }
  }
});
