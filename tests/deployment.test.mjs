import assert from "node:assert/strict";
import { constants, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const owners = [];
globalThis.siteStorageTestOwners = owners;
const fileModule = moduleUrl(`
  import {promises as actual} from "node:fs";
  export {constants} from "node:fs";
  export const promises = {...actual, chown: async (file, uid, gid) => {
    globalThis.siteStorageTestOwners.push({file, uid, gid});
  }};
`);
const storageSource = (await fs.readFile(new URL("../scripts/prepare-storage.mjs", import.meta.url), "utf8"))
  .replace('"node:fs"', JSON.stringify(fileModule));
const { prepareStorage } = await import(moduleUrl(storageSource));

test("storage initialization preserves imported data, seeds only missing files and scopes ownership", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-deploy-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const app = path.join(root, "app");
  const seed = path.join(root, "seed");
  const assets = path.join(app, "public", "assets");
  const history = path.join(app, "content", "blog", "history");
  await fs.mkdir(assets, { recursive: true });
  await fs.mkdir(history, { recursive: true });
  await fs.mkdir(seed);
  await fs.writeFile(path.join(seed, "existing.png"), "seed");
  await fs.writeFile(path.join(seed, "new.png"), "new seed");
  await fs.writeFile(path.join(assets, "existing.png"), "imported image");
  await fs.writeFile(path.join(history, "old.md"), "article history");
  owners.length = 0;
  await prepareStorage(app, seed);
  await prepareStorage(app, seed);
  assert.equal(await fs.readFile(path.join(assets, "existing.png"), "utf8"), "imported image");
  assert.equal(await fs.readFile(path.join(assets, "new.png"), "utf8"), "new seed");
  assert.equal(await fs.readFile(path.join(history, "old.md"), "utf8"), "article history");
  assert.ok(owners.length > 0);
  for (const owner of owners) {
    assert.equal(owner.uid, 1000);
    assert.equal(owner.gid, 1000);
    const blog = path.join(app, "content", "blog");
    assert.ok(owner.file === assets || owner.file.startsWith(assets + path.sep) ||
      owner.file === blog || owner.file.startsWith(blog + path.sep));
    if (process.platform === "linux") {
      const stat = await fs.stat(owner.file);
      assert.equal(stat.mode & 0o777, stat.isDirectory() ? 0o750 : 0o640);
    }
  }
});

test("storage initialization refuses symbolic links and never changes their target", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-deploy-link-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const app = path.join(root, "app");
  const assets = path.join(app, "public", "assets");
  const outside = path.join(root, "outside");
  const seed = path.join(root, "seed");
  await fs.mkdir(assets, { recursive: true });
  await fs.mkdir(outside);
  await fs.mkdir(seed);
  await fs.writeFile(path.join(outside, "keep.txt"), "unchanged");
  await fs.symlink(outside, path.join(assets, "link"), process.platform === "win32" ? "junction" : "dir");
  owners.length = 0;
  await assert.rejects(prepareStorage(app, seed), /regular files and directories/);
  assert.equal(await fs.readFile(path.join(outside, "keep.txt"), "utf8"), "unchanged");
  assert.ok(!owners.some(owner => owner.file.startsWith(outside)));
});

test("readiness reports database and storage failures without exposing internal errors", async () => {
  const state = { failDatabase: false, failStorage: false, accesses: [], queries: 0 };
  globalThis.siteReadinessTest = state;
  const dbModule = moduleUrl(`export const getDb = () => ({execute: async () => {
    globalThis.siteReadinessTest.queries++;
    if(globalThis.siteReadinessTest.failDatabase) throw new Error("private database detail");
  }});`);
  const fsModule = moduleUrl(`export {constants} from "node:fs";
    export const promises = {access: async (file, mode) => {
      globalThis.siteReadinessTest.accesses.push({file, mode});
      if(globalThis.siteReadinessTest.failStorage) throw new Error("private storage detail");
    }};`);
  const source = (await fs.readFile(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8"))
    .replace('"@/db"', JSON.stringify(dbModule))
    .replace('"node:fs"', JSON.stringify(fsModule))
    .replace('"drizzle-orm"', JSON.stringify(import.meta.resolve("drizzle-orm")))
    .replace('"next/server"', JSON.stringify(import.meta.resolve("next/server.js")));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const { GET } = await import(moduleUrl(compiled.outputText));
  const healthy = await GET();
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { status: "ok" });
  assert.equal(healthy.headers.get("cache-control"), "no-store");
  assert.equal(state.queries, 1);
  assert.equal(state.accesses.length, 5);
  assert.equal(state.accesses.filter(item => item.mode === (constants.R_OK | constants.W_OK | constants.X_OK)).length, 4);
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    for (const kind of ["failDatabase", "failStorage"]) {
      state[kind] = true;
      const response = await GET();
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: "unavailable" });
      state[kind] = false;
    }
  } finally { console.error = originalError; }
  assert.equal(errors.length, 2);
});
