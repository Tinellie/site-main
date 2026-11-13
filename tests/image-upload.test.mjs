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
    exports, Error, Buffer, TextDecoder, Uint8Array, Response, process, console, File, ...globals,
    require: name => name in imports ? imports[name] : require(name),
  });
  return exports;
}
const svgModule = await load("../src/lib/images/svg.ts");
const { resolveImagePath } = await load("../src/lib/images/resolve-image-path.ts");
class AuthError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
const assetKinds = await load("../src/features/gallery/asset-kind.ts");
const contentModule = await load("../src/lib/gallery/file-content.ts", {
  "server-only": {},
  "file-type": await import("file-type"),
  "@/features/gallery/asset-kind": assetKinds,
  "@/lib/auth/http": { AuthError },
  "@/lib/images/svg": svgModule,
});
const svg = '<?xml version="1.0" encoding="utf-8"?>\n<!-- SVG export -->\n<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><style>rect{fill:red}</style><rect width="32" height="32"/></svg>';
const names = await load("../src/lib/gallery/available-name.ts");
const assetPaths = await load("../src/features/gallery/asset-path.ts");
const lock = await load("../src/lib/content-write-lock.ts", { "server-only": {} });
async function assetImports(root = process.cwd()) {
  const filePaths = await load("../src/lib/gallery/file-paths.ts", {
    "server-only": {}, "@/lib/auth/http": { AuthError }, "@/features/gallery/asset-path": assetPaths,
  }, { process: { cwd: () => root } });
  return {
    "server-only": {}, "@/lib/auth/session": { requireEditor: async () => {} },
    "@/lib/auth/http": { AuthError }, "@/lib/images/resolve-image-path": { resolveImagePath },
    "@/lib/images/svg": svgModule, "@/lib/gallery/file-content": contentModule,
    "@/lib/gallery/available-name": names, "@/lib/gallery/file-paths": filePaths,
    "@/lib/content-write-lock": lock,
  };
}

test("SVG upload persists unchanged, reads with SVG MIME and serves with sandbox headers", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-svg-upload-"));
  t.after(() => fs.rm(root, { force: true, recursive: true }));
  let authorized = true;
  const assets = await load("../src/lib/cards/assets.ts", {
    ...await assetImports(root),
    "@/lib/auth/session": { requireEditor: async () => {
      if (!authorized) throw new AuthError("Unauthorized", 401);
    } },
    "@/lib/auth/http": { AuthError },
    "@/lib/images/resolve-image-path": { resolveImagePath },
    "@/lib/images/svg": svgModule,
    "@/lib/gallery/file-content": contentModule,
  }, { process: { cwd: () => root } });
  const file = new File([svg], "logo.SVG", { type: "image/svg+xml" });
  const image = await assets.uploadCardImage(file);
  assert.equal(image, "logo.SVG");
  assert.equal(await fs.readFile(path.join(root, "public", "assets", image), "utf8"), svg);
  const read = await assets.readCardImage(image);
  assert.equal(read.contentType, "image/svg+xml");
  assert.equal(read.bytes.toString(), svg);

  const route = await load("../src/app/api/cards/assets/[...path]/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/auth/http": { AuthError, authFailure: error => Response.json({ message: error.message }, { status: error.status }) },
    "@/lib/cards/assets": assets,
    "@/lib/images/svg": svgModule,
    "@/lib/gallery/file-content": contentModule,
  });
  const response = await route.GET(new Request("http://localhost/test"), { params: Promise.resolve({ path: [image] }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/svg+xml");
  assert.equal(response.headers.get("content-security-policy"), svgModule.SVG_CONTENT_SECURITY_POLICY);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(await response.text(), svg);
  authorized = false;
  await assert.rejects(assets.uploadCardImage(file), { status: 401 });
});

test("XML detection recognizes validated SVG without treating arbitrary XML as an image", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-svg-mime-"));
  t.after(() => fs.rm(root, { force: true, recursive: true }));
  const file = path.join(root, "asset");
  for (const [body, name, expected] of [
    [svg, "logo.svg", "image/svg+xml"],
    [svg, "logo.SVG", "image/svg+xml"],
    [svg, "replaced.png", "image/svg+xml"],
    [svg.replace(/^<\?xml[^>]+>\n/, ""), "logo.svg", "image/svg+xml"],
    ['<?xml version="1.0"?><document/>', "other.svg", "application/xml"],
    ['<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "active.svg", "application/xml"],
    [svg, "notes.txt", "text/plain; charset=utf-8"],
    ["not an image", "invalid.svg", "application/octet-stream"],
  ]) {
    await fs.writeFile(file, body);
    assert.equal(await contentModule.readAssetContentType(file, name), expected, name);
  }
});

test("shared upload validation rejects spoofed or active SVG and keeps raster validation", async () => {
  const assets = await load("../src/lib/cards/assets.ts", {
    ...await assetImports(),
    "server-only": {},
    "@/lib/auth/session": {},
    "@/lib/auth/http": { AuthError },
    "@/lib/images/resolve-image-path": { resolveImagePath },
    "@/lib/images/svg": svgModule,
    "@/lib/gallery/file-content": contentModule,
  });

  for (const [body, name, type] of [
    ["<html/>", "bad.svg", "image/svg+xml"],
    ['<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "bad.svg", "image/svg+xml"],
    [svg, "bad.png", "image/png"],
    ["not a png", "bad.png", "image/png"],
    [svg, "bad.svg", "text/html"],
    ["", "empty.svg", "image/svg+xml"],
  ]) await assert.rejects(assets.validateImageUpload(new File([body], name, { type })), { status: 400 });
  await assert.rejects(assets.validateImageUpload(new File(
    [new Uint8Array(assets.MAX_CARD_IMAGE_BYTES + 1)], "large.svg", { type: "image/svg+xml" },
  )), { status: 400 });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOo2HLnPwgzwBgAaZQMHZLpORUAAAAASUVORK5CYII=", "base64");
  assert.deepEqual(await assets.validateImageUpload(new File([png], "ok.png", { type: "image/png" })), png);
});

test("card image finalization preserves names, allocates numbered collisions and supports rollback", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-card-finalize-"));
  t.after(() => fs.rm(root, { force: true, recursive: true }));
  const assets = await load("../src/lib/cards/assets.ts", await assetImports(root), { process: { cwd: () => root } });
  const file = new File([svg], "原始名称.svg", { type: "image/svg+xml" });
  assert.equal(await assets.uploadCardImage(file), "原始名称.svg");
  assert.equal(await assets.uploadCardImage(file), "原始名称(1).svg");
  const created = await assets.createCardImage(file, "nested/new.svg");
  assert.equal(created.image, "nested/new.svg");
  const second = await assets.createCardImage(file, "nested/new.svg");
  assert.equal(second.image, "nested/new(1).svg");
  await second.rollback();
  await assert.rejects(fs.stat(path.join(root, "public", "assets", second.image)), { code: "ENOENT" });
  assert.equal((await assets.readCardImage(created.image)).bytes.toString(), svg);
  for (const requested of ["../escape.svg", "bad.png", ".gallery-operation-private/1.svg"]) {
    await assert.rejects(assets.createCardImage(file, requested), { status: 400 });
  }
});
