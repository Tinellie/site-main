import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function load(relative, imports = {}, globals = {}) {
  const source = await fs.readFile(new URL(relative, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports, Error, File, FormData, Buffer, TextDecoder, Uint8Array, Response, Request, ReadableStream, process, console, ...globals,
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
const svgModule = await load("../src/lib/images/svg.ts", { saxes: await import("saxes") });
const kinds = await load("../src/features/gallery/asset-kind.ts");
const content = await load("../src/lib/gallery/file-content.ts", {
  "server-only": {}, "file-type": await import("file-type"),
  "@/features/gallery/asset-kind": kinds,
  "@/lib/auth/http": { AuthError },
  "@/lib/images/svg": svgModule,
});
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOo2HLnPwgzwBgAaZQMHZLpORUAAAAASUVORK5CYII=", "base64");
const svg = '<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><style>path{fill:red}</style><path d="M0 0h32v32z"/></svg>';

async function setup(t, fileSystem = fs) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-replace-"));
  t.after(() => fs.rm(root, { force: true, recursive: true }));
  const files = path.join(root, "public", "assets");
  await fs.mkdir(files, { recursive: true });
  const paths = await load("../src/features/gallery/asset-path.ts");
  const pathModule = await load("../src/lib/gallery/file-paths.ts", {
    "server-only": {}, "@/lib/auth/http": { AuthError },
    "@/features/gallery/asset-path": paths,
  }, { process: { cwd: () => root } });
  const lock = await load("../src/lib/content-write-lock.ts", { "server-only": {} });
  let authorized = true;
  const replacement = await load("../src/lib/gallery/file-replacement.ts", {
    "server-only": {}, "node:fs": { promises: fileSystem },
    "@/lib/auth/session": { requireEditor: async () => {
      if (!authorized) throw new AuthError("Unauthorized", 401);
    } },
    "@/lib/content-write-lock": lock,
    "./file-paths": pathModule,
    "./file-content": content,
  });
  return { root, files, ...replacement, paths: pathModule, logout: () => { authorized = false; } };
}

test("same-category replacement preserves path, references and file permissions", async t => {
  const s = await setup(t);
  const relative = "original.png";
  const destination = path.join(s.files, relative);
  await fs.writeFile(destination, png, { mode: 0o640 });
  const article = path.join(s.root, "article.md");
  await fs.writeFile(article, "![cover](/assets/original.png)");
  assert.equal(await s.replaceManagedAsset(new File([svg], "new.svg", { type: "image/svg+xml" }), relative), relative);
  assert.equal(await fs.readFile(destination, "utf8"), svg);
  assert.equal(await fs.readFile(article, "utf8"), "![cover](/assets/original.png)");
  assert.equal(await content.readAssetContentType(destination, relative), "image/svg+xml");
  if (process.platform !== "win32") assert.equal((await fs.stat(destination)).mode & 0o777, 0o640);
  assert.deepEqual(await fs.readdir(s.files), [relative]);
  // The replacement module has no database or reference-store dependencies.
  await s.replaceManagedAsset(new File([png], "new.png", { type: "image/png" }), relative);
  assert.deepEqual(await fs.readFile(destination), png);
  assert.equal(await content.readAssetContentType(destination, relative), "image/png");
});

test("invalid replacements and unauthorized requests preserve the original bytes", async t => {
  const s = await setup(t);
  const destination = path.join(s.files, "original.png");
  await fs.writeFile(destination, png);
  for (const file of [
    new File(["text"], "wrong.txt", { type: "image/png" }),
    new File(["not an image"], "spoof.png", { type: "image/png" }),
    new File(['<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'], "active.svg"),
    new File([], "empty.png"),
    new File([new Uint8Array(content.MAX_REPLACEMENT_BYTES + 1)], "large.png"),
  ]) await assert.rejects(s.replaceManagedAsset(file, "original.png"), { status: 400 });
  await assert.rejects(s.replaceManagedAsset(new File([png], "new.png"), "../escape.png"), { status: 400 });
  await assert.rejects(s.replaceManagedAsset(new File([png], "new.png"), "missing.png"), { status: 404 });
  if (process.platform === "win32") {
    await fs.symlink(s.files, path.join(s.files, "linked"), "junction");
    await assert.rejects(s.replaceManagedAsset(new File([png], "new.png"), "linked/original.png"), { status: 400 });
  } else {
    await fs.symlink(destination, path.join(s.files, "link.png"));
    await assert.rejects(s.replaceManagedAsset(new File([png], "new.png"), "link.png"), { status: 400 });
  }
  s.logout();
  await assert.rejects(s.replaceManagedAsset(new File([png], "new.png"), "original.png"), { status: 401 });
  assert.deepEqual(await fs.readFile(destination), png);
});

test("a failed atomic rename leaves the original intact and removes temporary files", async t => {
  const s = await setup(t, {
    ...fs, rename: async () => { throw Object.assign(new Error("rename denied"), { code: "EACCES" }); },
  });
  const destination = path.join(s.files, "original.png");
  await fs.writeFile(destination, png);
  await assert.rejects(s.replaceManagedAsset(new File([svg], "new.svg"), "original.png"), { code: "EACCES" });
  assert.deepEqual(await fs.readFile(destination), png);
  assert.deepEqual(await fs.readdir(s.files), ["original.png"]);
});

test("video and audio formats stay in their own categories and text stays inert", async t => {
  const s = await setup(t);
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(4), Buffer.from("isommp42")]);
  const wav = Buffer.alloc(44);
  wav.write("RIFF"); wav.writeUInt32LE(36, 4); wav.write("WAVE", 8);
  wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.write("data", 36);
  await fs.writeFile(path.join(s.files, "movie.mov"), mp4);
  await s.replaceManagedAsset(new File([mp4], "new.mp4"), "movie.mov");
  assert.equal(await content.readAssetContentType(path.join(s.files, "movie.mov"), "movie.mov"), "video/mp4");
  await fs.writeFile(path.join(s.files, "sound.mp3"), wav);
  await s.replaceManagedAsset(new File([wav], "new.wav"), "sound.mp3");
  assert.equal(await content.readAssetContentType(path.join(s.files, "sound.mp3"), "sound.mp3"), "audio/wav");
  await assert.rejects(s.replaceManagedAsset(new File([wav], "new.wav"), "movie.mov"), { status: 400 });
  await assert.rejects(s.replaceManagedAsset(new File([png], "fake.mp4"), "movie.mov"), { status: 400 });
  await fs.writeFile(path.join(s.files, "notes.txt"), "old");
  await s.replaceManagedAsset(new File(["<html>text</html>"], "new.html"), "notes.txt");
  assert.equal(await content.readAssetContentType(path.join(s.files, "notes.txt"), "notes.txt"), "text/plain; charset=utf-8");
  await assert.rejects(s.replaceManagedAsset(new File([Buffer.from([0xff, 0x00])], "bad.txt"), "notes.txt"), { status: 400 });
});

test("Gallery serves replacement bytes with actual MIME, valid ranges and no cached content", async t => {
  const s = await setup(t);
  await fs.writeFile(path.join(s.files, "original.png"), png);
  await s.replaceManagedAsset(new File([svg], "new.svg"), "original.png");
  const route = await load("../src/app/api/gallery/assets/[...path]/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/auth/http": { AuthError, authFailure: error => Response.json({ message: error.message }, { status: error.status }) },
    "@/lib/gallery/file-paths": s.paths,
    "@/lib/gallery/file-content": content,
    "@/lib/images/svg": svgModule,
  });

  const context = { params: Promise.resolve({ path: ["original.png"] }) };
  const response = await route.GET(new Request("http://localhost/assets/original.png"), context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/svg+xml");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-security-policy"), svgModule.SVG_CONTENT_SECURITY_POLICY);
  assert.equal(await response.text(), svg);
  const partial = await route.GET(new Request("http://localhost/assets/original.png", {
    headers: { Range: "bytes=0-7" },
  }), context);
  assert.equal(partial.status, 206);
  assert.equal(await partial.text(), svg.slice(0, 8));
  assert.equal(partial.headers.get("content-range"), `bytes 0-7/${Buffer.byteLength(svg)}`);
});

test("replacement API requires authentication and trusted Origin and accepts bounded multipart uploads", async t => {
    const s = await setup(t);
    const destination = path.join(s.files, "original.png");
    await fs.writeFile(destination, png);
    const formReader = await load("../src/lib/images/upload-form.ts", {
      "server-only": {}, "@/lib/auth/http": { AuthError },
      "@/lib/cards/assets": { MAX_CARD_IMAGE_BYTES: content.MAX_REPLACEMENT_BYTES },
    });
    let signedIn = true;
    const invalidated = [];
    const route = await load("../src/app/api/gallery/files/route.ts", {
      "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
      "next/cache": { revalidatePath: (...args) => invalidated.push(args) },
      "@/lib/auth/session": { authorizeWrite: async request => {
        if (!signedIn) throw new AuthError("Unauthorized", 401);
        if (request.headers.get("origin") !== "http://localhost") throw new AuthError("Forbidden", 403);
      } },
      "@/lib/auth/http": { AuthError, authFailure: error => Response.json({ message: error.message }, { status: error.status }) },
      "@/lib/images/upload-form": formReader,
      "@/lib/gallery/file-manager": {},
      "@/lib/gallery/file-replacement": s,
    });
    const request = (origin = "http://localhost", file = new File([svg], "new.svg", { type: "image/svg+xml" })) => {
      const form = new FormData();
      form.set("path", "original.png");
      form.set("file", file);
      return new Request("http://localhost/api/gallery/files", { method: "PUT", headers: { Origin: origin }, body: form });
    };
    signedIn = false;
    assert.equal((await route.PUT(request())).status, 401);
    signedIn = true;
    assert.equal((await route.PUT(request("https://evil.invalid"))).status, 403);
    assert.equal((await route.PUT(request("http://localhost", new File(["text"], "wrong.txt")))).status, 400);
    assert.deepEqual(await fs.readFile(destination), png);
    const response = await route.PUT(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { path: "original.png" });
    assert.equal(await fs.readFile(destination, "utf8"), svg);
    assert.deepEqual(invalidated.map(args => Array.from(args)), [["/gallery", "layout"], ["/blog", "layout"]]);
    const oversized = request();
    oversized.headers.set("content-length", String(content.MAX_REPLACEMENT_BYTES + 65537));
    assert.equal((await route.PUT(oversized)).status, 413);
    assert.equal(await fs.readFile(destination, "utf8"), svg);
});
