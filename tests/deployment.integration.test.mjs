import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";

const base = process.env.DEPLOY_TEST_BASE_URL;
const standalone = process.env.DEPLOY_TEST_STANDALONE_ROOT;

test("standalone reads runtime articles and assets added after build and startup", {
  skip: !base || !standalone,
}, async t => {
  assert.equal(new URL(base).hostname, "127.0.0.1");
  assert.equal(path.resolve(standalone), path.resolve(".next", "standalone"));
  const suffix = randomBytes(8).toString("hex");
  const id = 1800000000 + randomBytes(3).readUIntBE(0, 3);
  const blog = path.join(standalone, "content", "blog");
  const assets = path.join(standalone, "public", "assets");
  const article = path.join(blog, `${id}.md`);
  const directory = path.join(assets, `deploy-${suffix}`);
  const image = path.join(directory, "runtime.png");
  await assert.rejects(fs.access(article), { code: "ENOENT" });
  await assert.rejects(fs.access(directory), { code: "ENOENT" });
  await fs.mkdir(path.join(blog, "history"), { recursive: true });
  await fs.mkdir(path.join(standalone, ".next", "cache"), { recursive: true });
  await fs.mkdir(directory, { recursive: true });
  t.after(async () => {
    for (const file of [article, image]) {
      await fs.unlink(file).catch(error => { if (error.code !== "ENOENT") throw error; });
    }
    await fs.rmdir(directory);
  });
  const healthy = await fetch(`${base}/api/health`);
  assert.equal(healthy.status, 200, await healthy.clone().text());
  assert.deepEqual(await healthy.json(), { status: "ok" });
  const source = title => matter.stringify("Runtime article body", {
    id, title, coverImage: "", publishedAt: new Date().toISOString(),
    updatedAt: "", tags: [], summary: "Runtime deployment check",
  });
  const firstTitle = `Standalone first ${suffix}`;
  const secondTitle = `Standalone second ${suffix}`;
  await fs.writeFile(article, source(firstTitle), { flag: "wx" });
  let page = await (await fetch(`${base}/blog`)).text();
  assert.ok(page.includes(firstTitle));
  await fs.writeFile(article, source(secondTitle));
  page = await (await fetch(`${base}/blog`)).text();
  assert.ok(page.includes(secondTitle));
  assert.ok(!page.includes(firstTitle), "A build-time or runtime cached article list must not persist");
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOo2HLnPwgzwBgAaZQMHZLpORUAAAAASUVORK5CYII=", "base64");
  await fs.writeFile(image, bytes, { flag: "wx" });
  const publicFile = await fetch(`${base}/assets/deploy-${suffix}/runtime.png`);
  assert.equal(publicFile.status, 200);
  assert.deepEqual(Buffer.from(await publicFile.arrayBuffer()), bytes);
  const gallery = await (await fetch(`${base}/gallery/deploy-${suffix}`)).text();
  assert.ok(gallery.includes("runtime.png"));
  assert.ok(!gallery.includes('name="next-error" content="not-found"'));
  await fs.unlink(image);
  assert.equal((await fetch(`${base}/assets/deploy-${suffix}/runtime.png`)).status, 404);
});
