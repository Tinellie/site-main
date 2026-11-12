import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rmdir, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createConnection } from "mysql2/promise";
import matter from "gray-matter";

const database = process.env.GALLERY_TEST_DATABASE_URL;
const base = process.env.GALLERY_TEST_BASE_URL;
const origin = process.env.GALLERY_TEST_ORIGIN;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOo2HLnPwgzwBgAaZQMHZLpORUAAAAASUVORK5CYII=", "base64");

test("Gallery upload, reference indexing, synchronized moves and confirmed deletion persist", {
  skip: !database || !base || !origin,
}, async t => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(database).hostname));
  assert.equal(new URL(base).hostname, "127.0.0.1");
  assert.ok(new URL(database).pathname === "/auth_validation" || process.env.GALLERY_TEST_ALLOW_SHARED_DATABASE === "1",
    "Shared-database validation requires explicit opt-in and user permission");
  const db = await createConnection({ uri: database, timezone: "Z" });
  await db.query("SET time_zone = '+00:00'");
  const prefix = `gallery-test-${randomBytes(8).toString("hex")}`;
  const root = path.resolve("public", "assets");
  const postId = 1500000000 + randomBytes(3).readUIntBE(0, 3);
  const legacyId = postId + 20000000;
  const postFile = id => path.resolve("content", "blog", `${id}.md`);
  const history = id => path.resolve("content", "blog", "history", String(id));
  for (const id of [postId, legacyId]) {
    await assert.rejects(access(postFile(id)), { code: "ENOENT" });
    await assert.rejects(access(history(id)), { code: "ENOENT" });
  }
  const cardIds = [];
  const files = new Set([`${prefix}.png`, `${prefix}/nested/moved.png`, `${prefix}/rollback.png`, `${prefix}/block.png`, `${prefix}/encoded folder/图片.png`]);
  const directories = new Set([`${prefix}/nested`, `${prefix}/encoded folder`, `${prefix}-folder.png`, prefix]);
  let userId;
  const token = randomBytes(32).toString("hex");
  const hash = value => createHash("sha256").update(value).digest("hex");
  const cookie = `${process.env.GALLERY_TEST_COOKIE_NAME || "__Host-blog-session"}=${token}`;
  t.after(async () => {
    try {
      for (const id of cardIds) await db.execute("DELETE FROM content_cards WHERE id = ?", [id]);
      await db.execute("DELETE FROM article_image_references WHERE post_id IN (?, ?)", [postId, legacyId]);
      if (userId) await db.execute("DELETE FROM auth_users WHERE id = ?", [userId]);
      for (const id of [postId, legacyId]) {
        await unlink(postFile(id)).catch(error => { if (error.code !== "ENOENT") throw error; });
        const versions = await readdir(history(id)).catch(error => {
          if (error.code !== "ENOENT") throw error;
          return [];
        });
        for (const version of versions) await unlink(path.join(history(id), version));
        if (versions.length) await rmdir(history(id));
      }
      for (const file of files) await unlink(path.join(root, file)).catch(error => { if (error.code !== "ENOENT") throw error; });
      for (const directory of directories) await rmdir(path.join(root, directory)).catch(error => { if (error.code !== "ENOENT") throw error; });
    } finally { await db.end(); }
  });
  const [user] = await db.execute("INSERT INTO auth_users (username, password_hash) VALUES (?, ?)", [prefix, "unused-test-session-only"]);
  userId = user.insertId;
  await db.execute("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))",
    [hash(token), userId]);
  async function request(url, { method = "GET", body, authenticated = true, requestOrigin = origin, headers = {} } = {}) {
    return fetch(`${base}${url}`, {
      method,
      headers: { Origin: requestOrigin, ...(authenticated ? { Cookie: cookie } : {}),
        ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  }
  async function expect(response, status) {
    assert.equal(response.status, status, await response.clone().text());
    return response.json();
  }
  const manage = (method, body, options) => request("/api/gallery/files", { method, body, ...options });
  const inspect = (relative, action) => request(`/api/gallery/files?${new URLSearchParams({ path: relative, ...(action && { action }) })}`);
  const form = (relative, bytes = png, name = `${prefix}.png`) => {
    const body = new FormData();
    body.set("file", new Blob([bytes], { type: "image/png" }), name);
    body.set("path", relative);
    return body;
  };
  await t.test("management requires both authentication and a trusted Origin", async () => {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      assert.equal((await request("/api/gallery/files", { method, authenticated: false })).status, 401);
    }
    for (const method of ["POST", "PATCH", "DELETE"]) {
      assert.equal((await manage(method, { path: `${prefix}.png` }, { requestOrigin: "https://evil.invalid" })).status, 403);
    }
    assert.equal((await request("/gallery", { authenticated: false })).status, 200);
  });
  await t.test("suggestion defaults to root, suffixes collisions, validates paths and detects new folders", async () => {
    const suggestion = await expect(await inspect(`ignored/${prefix}.png`, "suggest"), 200);
    assert.equal(suggestion.path, `${prefix}.png`);
    assert.equal(suggestion.createsFolder, false);
    assert.equal((await expect(await inspect(`${prefix}/nested/moved.png`), 200)).createsFolder, true);
    for (const invalid of ["../escape.png", "%2e%2e/escape.png", "con.png", "bad\\file.png"]) {
      assert.equal((await inspect(invalid)).status, 400);
    }
    await expect(await manage("POST", form(`${prefix}.png`)), 201);
    const collision = await expect(await inspect(`${prefix}.png`, "suggest"), 200);
    assert.match(collision.path, new RegExp(`^${prefix}-[a-f0-9]{8}\\.png$`));
    await mkdir(path.join(root, `${prefix}-folder.png`));
    const directoryCollision = await expect(await inspect(`${prefix}-folder.png`, "suggest"), 200);
    assert.match(directoryCollision.path, new RegExp(`^${prefix}-folder-[a-f0-9]{8}\\.png$`));
    await expect(await manage("POST", form(`${prefix}.png`)), 409);
    await expect(await manage("POST", form(`${prefix}/block.png`, Buffer.from("not an image"))), 400);
    await expect(await manage("POST", form(`${prefix}/block.png`, Buffer.alloc(10 * 1024 * 1024 + 1))), 400);
  });
  await t.test("new production assets are immediately readable and ranges are valid", async () => {
    await expect(await manage("POST", form(`${prefix}/encoded folder/图片.png`)), 201);
    const encodedGallery = await (await request(`/gallery/${prefix}/encoded%20folder`)).text();
    assert.ok(encodedGallery.includes("图片.png"));
    assert.ok(!encodedGallery.includes('name="next-error" content="not-found"'));
    for (const url of [`/assets/${prefix}.png`, `/api/gallery/assets/${prefix}.png`]) {
      const response = await request(url, { authenticated: false });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    }
    const partial = await request(`/assets/${prefix}.png`, { headers: { Range: "bytes=0-7" }, authenticated: false });
    assert.equal(partial.status, 206);
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), png.subarray(0, 8));
    for (const range of ["bytes=-0", "bytes=99999-", "bytes=5-2", "bytes=0-1,4-5"]) {
      assert.equal((await request(`/assets/${prefix}.png`, { headers: { Range: range } })).status, 416);
    }
  });
  let post;
  await t.test("each article save replaces its image index and refreshes the stored title", async () => {
    post = { title: prefix, coverImage: `${prefix}.png`, tags: [], content: `![a](${prefix}.png)\n\n![version](${prefix}.png?v=1#detail)\n\n![ref][same]\n\n[same]: /assets/${prefix}.png\n\n<img src="/assets/${prefix}.png">` };
    await expect(await request(`/api/blog/posts/${postId}`, { method: "PUT", body: post }), 200);
    let [refs] = await db.execute("SELECT * FROM article_image_references WHERE post_id = ?", [postId]);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].asset_path, `${prefix}.png`);
    assert.equal(refs[0].path_hash, hash(`${prefix}.png`));
    post = { ...post, title: `${prefix} updated`, content: `${post.content}\n\n![missing](${prefix}/missing.png)` };
    await expect(await request(`/api/blog/posts/${postId}`, { method: "PUT", body: post }), 200);
    [refs] = await db.execute("SELECT * FROM article_image_references WHERE post_id = ?", [postId]);
    assert.equal(refs.length, 2);
    assert.ok(refs.every(ref => ref.post_title === post.title));
    post = { ...post, content: post.content.replace(`\n\n![missing](${prefix}/missing.png)`, "") };
    await expect(await request(`/api/blog/posts/${postId}`, { method: "PUT", body: post }), 200);
    [refs] = await db.execute("SELECT * FROM article_image_references WHERE post_id = ?", [postId]);
    assert.equal(refs.length, 1, "Removed images must not retain stale reference rows");
  });
  await t.test("usage includes old articles, covers, reference images, Connect and both Works card kinds", async () => {
    const now = new Date().toISOString();
    await writeFile(postFile(legacyId), matter.stringify(`![legacy](${prefix}.png)`, {
      id: legacyId, title: `${prefix} legacy`, coverImage: "", publishedAt: now, updatedAt: "", tags: [], summary: "",
    }), { flag: "wx" });
    for (const kind of ["connect", "project", "article"]) {
      const result = await expect(await request("/api/cards", { method: "POST", body: {
        kind, title: prefix, username: "", link: "/gallery", description: "", image: `${prefix}.png`, icon: "GitHub", categoryId: null,
      } }), 201);
      cardIds.push(result.card.id);
    }
    const { usage } = await expect(await inspect(`${prefix}.png`, "references"), 200);
    assert.equal(usage.connect, true);
    assert.equal(usage.works, true);
    assert.deepEqual(usage.articles.map(article => article.id).sort(), [postId, legacyId].sort());
    assert.equal(usage.articles.find(article => article.id === postId).title, post.title);
    assert.equal((await expect(await manage("DELETE", { path: `${prefix}.png` }), 409)).deleted, false);
    await access(path.join(root, `${prefix}.png`));
  });
  await t.test("move rolls back its linked destination when reference scanning fails", async () => {
    const original = await readFile(postFile(legacyId), "utf8");
    try {
      await writeFile(postFile(legacyId), "---\nid: [invalid yaml\n---\n");
      await expect(await manage("PATCH", { path: `${prefix}.png`, target: `${prefix}/rollback.png` }), 503);
      await access(path.join(root, `${prefix}.png`));
      await assert.rejects(access(path.join(root, `${prefix}/rollback.png`)), { code: "ENOENT" });
    } finally { await writeFile(postFile(legacyId), original); }
  });
  await t.test("moving a shared image rewrites all active articles and cards without overwriting", async () => {
    const target = `${prefix}/nested/moved.png`;
    await expect(await manage("PATCH", { path: `${prefix}.png`, target }), 200);
    await assert.rejects(access(path.join(root, `${prefix}.png`)), { code: "ENOENT" });
    assert.deepEqual(await readFile(path.join(root, target)), png);
    for (const id of [postId, legacyId]) {
      const moved = await expect(await request(`/api/blog/posts/${id}`), 200);
      assert.ok(moved.content.includes(`/assets/${target}`));
      assert.ok(!moved.content.includes(`(${prefix}.png)`));
      assert.ok((await readdir(history(id))).length >= 1);
      const [refs] = await db.execute("SELECT asset_path FROM article_image_references WHERE post_id = ?", [id]);
      assert.ok(refs.some(ref => ref.asset_path === target));
      assert.ok(!refs.some(ref => ref.asset_path === `${prefix}.png`));
    }
    const movedPost = await expect(await request(`/api/blog/posts/${postId}`), 200);
    assert.equal(movedPost.coverImage, `/assets/${target}`);
    assert.ok(movedPost.content.includes(`/assets/${target}?v=1#detail`));
    const [cards] = await db.query("SELECT image FROM content_cards WHERE id IN (?)", [cardIds]);
    assert.ok(cards.every(card => card.image === target));
    await expect(await manage("POST", form(`${prefix}.png`)), 201);
    await expect(await manage("PATCH", { path: `${prefix}.png`, target }), 409);
    assert.deepEqual(await readFile(path.join(root, `${prefix}.png`)), png);
    assert.equal((await request(`/assets/${target}`, { authenticated: false })).status, 200);
    const gallery = await (await request(`/gallery/${prefix}/nested`)).text();
    assert.ok(gallery.includes("moved.png"));
  });
  await t.test("symbolic-link parents are rejected", async () => {
    const link = path.join(root, prefix, "link");
    await mkdir(path.join(root, prefix), { recursive: true });
    await symlink(path.join(root, prefix, "nested"), link, process.platform === "win32" ? "junction" : "dir");
    try { assert.equal((await inspect(`${prefix}/link/moved.png`)).status, 400); }
    finally { await unlink(link); }
  });
  await t.test("existing article and card image-move endpoints share reference synchronization", async () => {
    const original = `${prefix}/nested/moved.png`;
    const viaArticle = `${prefix}/nested/article.png`;
    const viaCard = `${prefix}/nested/card.png`;
    files.add(viaArticle);
    files.add(viaCard);
    await expect(await request("/api/blog/assets/rename", {
      method: "PATCH", body: { sourcePath: original, targetPath: viaArticle },
    }), 200);
    await expect(await request("/api/cards/assets", {
      method: "PATCH", body: { source: viaArticle, target: viaCard },
    }), 200);
    const article = await expect(await request(`/api/blog/posts/${postId}`), 200);
    assert.equal(article.coverImage, `/assets/${viaCard}`);
    assert.ok(article.content.includes(`/assets/${viaCard}?v=1#detail`));
    const [cards] = await db.query("SELECT image FROM content_cards WHERE id IN (?)", [cardIds]);
    assert.ok(cards.every(card => card.image === viaCard));
    await expect(await manage("PATCH", { path: viaCard, target: original }), 200);
  });
  await t.test("deletion rechecks references, requires explicit override and removes the file", async () => {
    const target = `${prefix}/nested/moved.png`;
    await expect(await manage("DELETE", { path: target }), 409);
    assert.equal((await expect(await manage("DELETE", { path: target, confirmReferences: true }), 200)).deleted, true);
    assert.equal((await request(`/assets/${target}`, { authenticated: false })).status, 404);
    assert.equal((await expect(await manage("DELETE", { path: `${prefix}.png` }), 200)).deleted, true);
  });
});
