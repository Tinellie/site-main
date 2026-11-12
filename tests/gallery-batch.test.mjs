import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function load(file, imports = {}, globals = {}) {
  const source = await fs.readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports, Error, Map, Set, console, process, Response, Request, URL, ...globals,
    require(name) {
      if (name in imports) return imports[name];
      assert.ok(name.startsWith("node:"), `Unexpected dependency: ${name}`);
      return require(name);
    },
  });
  return exports;
}
class AuthError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
const paths = await load("features/gallery/asset-path.ts");
const names = await load("lib/gallery/available-name.ts");
const markdown = await load("lib/images/markdown-images.ts", {
  "mdast-util-from-markdown": await import("mdast-util-from-markdown"),
  "micromark-util-decode-string": await import("micromark-util-decode-string"),
});
const matter = require("gray-matter");

async function setup(t, fileSystem = fs) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-batch-"));
  t.after(() => fs.rm(root, { force: true, recursive: true }));
  const assets = path.join(root, "public", "assets");
  const blog = path.join(root, "content", "blog");
  await fs.mkdir(assets, { recursive: true });
  await fs.mkdir(blog, { recursive: true });
  const state = { cards: [], references: [], failCommit: false, authorized: true };
  const schema = { contentCards: { id: "id" }, articleImageReferences: { postId: "postId" } };
  const db = {
    select: () => ({ from: async () => state.cards.map(row => ({ ...row })) }),
    update: () => ({ set: values => ({ where: async predicate => {
      state.cards.filter(predicate).forEach(row => Object.assign(row, values));
    } }) }),
    delete: () => ({ where: async predicate => { state.references = state.references.filter(row => !predicate(row)); } }),
    insert: () => ({ values: async values => { state.references.push(...values); } }),
    async transaction(callback) {
      const previous = structuredClone({ cards: state.cards, references: state.references });
      try {
        const result = await callback(db);
        if (state.failCommit) throw new Error("Injected commit failure");
        return result;
      } catch (error) { Object.assign(state, previous); throw error; }
    },
  };
  const globals = { process: { cwd: () => root, env: { AUTH_ORIGIN: "https://example.test" } } };
  const referenceStore = await load("lib/images/reference-store.ts", {
    "server-only": {}, "drizzle-orm": { eq: (key, value) => row => row[key] === value },
    "@/db": { getDb: () => db }, "@/db/schema": schema,
    "@/features/gallery/asset-path": paths, "@/lib/images/markdown-images": markdown,
  }, globals);
  const posts = {
    listPostSummaries: async () => (await fs.readdir(blog)).filter(name => /^\d+\.md$/.test(name))
      .map(name => ({ id: Number(name.slice(0, -3)) })),
    getPostById: async id => {
      const parsed = matter(await fs.readFile(path.join(blog, `${id}.md`), "utf8"));
      return { ...parsed.data, id, content: parsed.content };
    },
  };
  const references = await load("lib/gallery/reference-moves.ts", {
    "server-only": {}, "gray-matter": matter,
    "drizzle-orm": { eq: (key, value) => row => row[key] === value },
    "@/db": { getDb: () => db }, "@/db/schema": schema,
    "@/features/gallery/asset-path": paths, "@/lib/blog/post-store": posts,
    "@/lib/images/reference-store": referenceStore, "@/lib/images/markdown-images": markdown,
  }, globals);
  const pathModule = await load("lib/gallery/file-paths.ts", {
    "server-only": {}, "@/lib/auth/http": { AuthError }, "@/features/gallery/asset-path": paths,
  }, globals);
  const lock = await load("lib/content-write-lock.ts", { "server-only": {} });
  const batch = await load("lib/gallery/batch.ts", {
    "server-only": {}, "node:fs": { promises: fileSystem }, "@/lib/auth/http": { AuthError },
    "@/lib/auth/session": { requireEditor: async () => {
      if (!state.authorized) throw new AuthError("Unauthorized", 401);
    } },
    "@/lib/content-write-lock": lock, "./file-paths": pathModule,
    "./available-name": names, "./reference-moves": references,
  }, globals);
  async function write(relative, content = relative) {
    const file = path.join(assets, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }
  async function post(content, coverImage = "") {
    await fs.writeFile(path.join(blog, "1.md"), matter.stringify(content, { title: "Post", coverImage }));
  }
  const read = relative => fs.readFile(path.join(assets, relative), "utf8");
  return { ...batch, ...references, state, assets, root, blog, write, post, read, posts,
    run: async value => batch.batchAssets(batch.parseBatchInput({ destination: "", ...value })) };
}

test("folder rename repairs nested card, cover, Markdown, HTML and reference-index paths, not sibling prefixes", async t => {
  const s = await setup(t);
  await s.write("old/nested/a.png");
  await s.write("old/b.svg");
  await s.write("oldish/a.png");
  s.state.cards = [{ id: 1, image: "old/nested/a.png", kind: "connect" },
    { id: 2, image: "oldish/a.png", kind: "project" }];
  await s.post('![a](/assets/old/nested/a.png?v=2#x)\n<img src="/assets/old/b.svg#cover">\n' +
    '![external](https://other.test/assets/old/b.svg)\n![same](https://example.test/assets/old/b.svg?x=1)',
  "@images/assets/old/b.svg");
  assert.equal((await s.run({ action: "rename", paths: ["old"], target: "new" })).completed, true);
  assert.equal(await s.read("new/nested/a.png"), "old/nested/a.png");
  assert.equal(s.state.cards[0].image, "new/nested/a.png");
  assert.equal(s.state.cards[1].image, "oldish/a.png");
  const post = await s.posts.getPostById(1);
  assert.equal(post.coverImage, "/assets/new/b.svg");
  assert.match(post.content, /\/assets\/new\/nested\/a\.png\?v=2#x/);
  assert.match(post.content, /src="\/assets\/new\/b.svg#cover"/);
  assert.match(post.content, /https:\/\/other.test\/assets\/old\/b.svg/);
  assert.match(post.content, /\/assets\/new\/b.svg\?x=1/);
  assert.deepEqual(Array.from(s.state.references, row => row.assetPath).sort(), ["new/b.svg", "new/nested/a.png"]);
  assert.equal((await fs.readdir(path.join(s.blog, "history", "1"))).length, 1);
  assert.ok(!(await fs.readdir(s.assets)).some(name => name.startsWith(".gallery-operation-")));
});

test("copy preserves original references and numbered files/folders use ASCII parentheses", async t => {
  const s = await setup(t);
  await s.write("folder.v1/photo.png", "photo");
  await s.write("a.png", "a");
  await s.write("a(1).png", "one");
  s.state.cards = [{ id: 1, kind: "connect", image: "folder.v1/photo.png" }];
  let result = await s.run({ action: "copy", paths: ["folder.v1", "a.png"] });
  assert.equal(result.completed, false);
  assert.deepEqual({ ...result.conflicts }, { files: 1, folders: 1 });
  assert.equal((await fs.readdir(s.assets)).length, 3);
  result = await s.run({ action: "copy", paths: ["folder.v1", "a.png"], filePolicy: "number", folderPolicy: "number" });
  assert.equal(result.completed, true);
  assert.equal(await s.read("folder.v1(1)/photo.png"), "photo");
  assert.equal(await s.read("a(2).png"), "a");
  assert.equal(s.state.cards[0].image, "folder.v1/photo.png");
});

test("recursive merge moves nonconflicts and numbers all file conflicts in one operation", async t => {
  const s = await setup(t);
  await s.write("from/set/deep/a.png", "incoming");
  await s.write("from/set/deep/b.png", "b");
  await s.write("to/set/deep/a.png", "existing");
  await s.write("to/set/keep.txt", "keep");
  s.state.cards = [{ id: 1, image: "from/set/deep/a.png", kind: "project" }];
  let result = await s.run({ action: "move", paths: ["from/set"], destination: "to", folderPolicy: "merge" });
  assert.deepEqual({ ...result.conflicts }, { files: 1, folders: 2 });
  assert.equal(await s.read("from/set/deep/b.png"), "b");
  result = await s.run({ action: "move", paths: ["from/set"], destination: "to",
    folderPolicy: "merge", filePolicy: "number" });
  assert.equal(result.completed, true);
  assert.equal(await s.read("to/set/deep/a.png"), "existing");
  assert.equal(await s.read("to/set/deep/a(1).png"), "incoming");
  assert.equal(await s.read("to/set/keep.txt"), "keep");
  assert.equal(s.state.cards[0].image, "to/set/deep/a(1).png");
  await assert.rejects(fs.stat(path.join(s.assets, "from", "set")), { code: "ENOENT" });
});

test("skip leaves files and their references in place during a recursive merge", async t => {
  const s = await setup(t);
  await s.write("from/set/a.png", "incoming");
  await s.write("from/set/b.png", "b");
  await s.write("to/set/a.png", "existing");
  s.state.cards = [{ id: 1, image: "from/set/a.png", kind: "connect" },
    { id: 2, image: "from/set/b.png", kind: "connect" }];
  const result = await s.run({ action: "move", paths: ["from/set"], destination: "to",
    folderPolicy: "merge", filePolicy: "skip" });
  assert.deepEqual(Array.from(result.skipped), ["from/set/a.png"]);
  assert.equal(await s.read("from/set/a.png"), "incoming");
  assert.equal(await s.read("to/set/b.png"), "b");
  assert.equal(s.state.cards[0].image, "from/set/a.png");
  assert.equal(s.state.cards[1].image, "to/set/b.png");
});

test("folder overwrite replaces the whole target and warns about references to removed descendants", async t => {
  const s = await setup(t);
  await s.write("from/set/new.png");
  await s.write("to/set/old.png");
  s.state.cards = [{ id: 1, image: "to/set/old.png", kind: "connect" }];
  await s.post("![old](/assets/to/set/old.png)");
  const input = { action: "move", paths: ["from/set"], destination: "to", folderPolicy: "overwrite" };
  const result = await s.run(input);
  assert.equal(result.completed, false);
  assert.equal(result.usage.connect, true);
  assert.equal(result.usage.articles[0].id, 1);
  assert.equal(await s.read("to/set/old.png"), "to/set/old.png");
  assert.equal((await s.run({ ...input, confirmReferences: true })).completed, true);
  assert.deepEqual(await fs.readdir(path.join(s.assets, "to", "set")), ["new.png"]);
});

test("database commit failure restores moved files, overwritten targets, Markdown and reference rows", async t => {
  const s = await setup(t);
  await s.write("from/set/a.png", "source");
  await s.write("to/set/a.png", "target");
  await s.write("to/set/extra.txt", "extra");
  s.state.cards = [{ id: 1, image: "from/set/a.png", kind: "connect" }];
  await s.post("![a](/assets/from/set/a.png)");
  const original = await fs.readFile(path.join(s.blog, "1.md"), "utf8");
  s.state.failCommit = true;
  await assert.rejects(s.run({ action: "move", paths: ["from/set"], destination: "to", folderPolicy: "overwrite" }),
    /Injected commit failure/);
  assert.equal(await s.read("from/set/a.png"), "source");
  assert.equal(await s.read("to/set/a.png"), "target");
  assert.equal(await s.read("to/set/extra.txt"), "extra");
  assert.equal(s.state.cards[0].image, "from/set/a.png");
  assert.equal(await fs.readFile(path.join(s.blog, "1.md"), "utf8"), original);
  assert.equal((await fs.readdir(path.join(s.blog, "history", "1"))).length, 0);
  assert.ok(!(await fs.readdir(s.assets)).some(name => name.startsWith(".gallery-operation-")));
});

test("failed partial copy is removed and restores an overwritten directory", async t => {
  const s = await setup(t, { ...fs, cp: async (from, to) => {
    await fs.mkdir(to);
    await fs.writeFile(path.join(to, "partial.txt"), "partial");
    throw new Error("Injected copy failure");
  } });
  await s.write("from/set/a.png");
  await s.write("to/set/old.txt", "old");
  await assert.rejects(s.run({ action: "copy", paths: ["from/set"], destination: "to", folderPolicy: "overwrite" }),
    /Injected copy failure/);
  assert.equal(await s.read("to/set/old.txt"), "old");
  assert.deepEqual(await fs.readdir(path.join(s.assets, "to", "set")), ["old.txt"]);
  assert.equal(await s.read("from/set/a.png"), "from/set/a.png");
});

test("batch deletion deduplicates nested selections and requires one aggregated reference confirmation", async t => {
  const s = await setup(t);
  await s.write("set/a.png");
  await s.write("set/deep/b.png");
  s.state.cards = [{ id: 1, kind: "connect", image: "set/a.png" }, { id: 2, kind: "project", image: "set/deep/b.png" }];
  const input = { action: "delete", paths: ["set", "set/a.png"] };
  const result = await s.run(input);
  assert.equal(result.usage.connect, true);
  assert.equal(result.usage.works, true);
  assert.equal(await s.read("set/a.png"), "set/a.png");
  assert.equal((await s.run({ ...input, confirmReferences: true })).completed, true);
  assert.deepEqual(await fs.readdir(s.assets), []);
});

test("empty folders copy, move, merge and delete without image references", async t => {
  const s = await setup(t);
  await fs.mkdir(path.join(s.assets, "empty"));
  await fs.mkdir(path.join(s.assets, "to"));
  assert.equal((await s.run({ action: "copy", paths: ["empty"], destination: "to" })).completed, true);
  assert.equal((await s.run({ action: "move", paths: ["empty"], destination: "to", folderPolicy: "merge" })).completed, true);
  assert.equal((await s.run({ action: "rename", paths: ["to/empty"], target: "to/renamed" })).completed, true);
  assert.equal((await s.run({ action: "delete", paths: ["to"] })).completed, true);
  assert.deepEqual(await fs.readdir(s.assets), []);
});

test("unsafe paths, subtree targets, symlinks and self-overwrites are rejected before writes", async t => {
  const s = await setup(t);
  await s.write("set/deep/a.png");
  for (const input of [
    { action: "delete", paths: [""] }, { action: "delete", paths: [".."] },
    { action: "delete", paths: [".gallery-operation-fake/1"] },
    { action: "copy", paths: ["set"], destination: "set/deep" },
    { action: "move", paths: ["set"], folderPolicy: "overwrite" },
    { action: "rename", paths: ["set"], target: "other/set" },
    { action: "copy", paths: ["set"], destination: "missing" },
  ]) await assert.rejects(s.run(input), error => error instanceof AuthError);
  await fs.symlink(path.join(s.assets, "set"), path.join(s.assets, "link"),
    process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(s.run({ action: "delete", paths: ["link"] }), { status: 400 });
  await assert.rejects(s.run({ action: "copy", paths: ["set"], destination: "link" }), { status: 400 });
  s.state.authorized = false;
  await assert.rejects(s.run({ action: "delete", paths: ["set"] }), { status: 401 });
  assert.equal(await s.read("set/deep/a.png"), "set/deep/a.png");
});

test("concurrent copies use the content lock to allocate distinct numbered names", async t => {
  const s = await setup(t);
  await s.write("a.png");
  await Promise.all([1, 2, 3].map(() => s.run({ action: "copy", paths: ["a.png"], filePolicy: "number" })));
  assert.deepEqual((await fs.readdir(s.assets)).sort(), ["a(1).png", "a(2).png", "a(3).png", "a.png"]);
});

test("file overwrite applies uniformly, while folder skip leaves the entire conflicting source unchanged", async t => {
  const s = await setup(t);
  await s.write("from/a.png", "new-a");
  await s.write("from/b.png", "new-b");
  await s.write("from/set/new.png");
  await s.write("to/a.png", "old-a");
  await s.write("to/b.png", "old-b");
  await s.write("to/set/keep.png");
  s.state.cards = [{ id: 1, image: "from/a.png", kind: "connect" },
    { id: 2, image: "to/a.png", kind: "project" }];
  const result = await s.run({ action: "move", paths: ["from/a.png", "from/b.png", "from/set"],
    destination: "to", filePolicy: "overwrite", folderPolicy: "skip" });
  assert.equal(result.completed, true);
  assert.equal(await s.read("to/a.png"), "new-a");
  assert.equal(await s.read("to/b.png"), "new-b");
  assert.equal(await s.read("from/set/new.png"), "from/set/new.png");
  assert.equal(await s.read("to/set/keep.png"), "to/set/keep.png");
  assert.equal(s.state.cards[0].image, "to/a.png");
  assert.equal(s.state.cards[1].image, "to/a.png");
  assert.deepEqual(Array.from(result.skipped), ["from/set"]);
});

test("batch endpoint authorizes before parsing, validates payloads, and only invalidates completed operations", async () => {
  let authorized = false, parsed = 0, invalidations = 0;
  const route = await load("app/api/gallery/batch/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "next/cache": { revalidatePath: () => invalidations++ },
    "@/lib/auth/http": { AuthError, authFailure: error => Response.json({ message: error.message }, { status: error.status }) },
    "@/lib/auth/session": { authorizeWrite: async request => {
      if (!authorized) throw new AuthError("Unauthorized", 401);
      if (request.headers.get("origin") !== "https://example.test") throw new AuthError("Origin", 403);
    } },
    "@/lib/gallery/batch": {
      parseBatchInput: value => { parsed++; return value; },
      batchAssets: async value => value,
    },
  });
  const request = (body, origin = "https://example.test") => new Request("https://example.test/api/gallery/batch", {
    method: "POST", headers: { origin }, body,
  });
  assert.equal((await route.POST(request("invalid"))).status, 401);
  assert.equal(parsed, 0);
  authorized = true;
  assert.equal((await route.POST(request("{}", "https://other.test"))).status, 403);
  assert.equal((await route.POST(request("invalid"))).status, 400);
  assert.equal((await route.POST(request(JSON.stringify({ completed: false, conflicts: { files: 1 } })))).status, 409);
  assert.equal(invalidations, 0);
  assert.equal((await route.POST(request('{"completed":true}'))).status, 200);
  assert.equal(invalidations, 2);
});
