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
    exports, Error, Buffer, console, File, FormData, Request, Response, URL, ...globals,
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
const resolver = await load("lib/images/resolve-image-path.ts");
const validation = await load("features/cards/validation.ts", {
  "../../lib/images/resolve-image-path": resolver,
});
const uploadForm = await load("lib/images/upload-form.ts", {
  "server-only": {}, "@/lib/auth/http": { AuthError },
  "@/lib/cards/assets": { MAX_CARD_IMAGE_BYTES: 10 * 1024 * 1024 },
});
const submission = await load("lib/cards/submission.ts", {
  "@/features/cards/validation": validation, "@/lib/images/upload-form": uploadForm,
  "@/lib/cards/assets": { MAX_CARD_IMAGE_BYTES: 10 * 1024 * 1024 },
});
const input = { kind: "project", title: "Test", username: "", link: "/", description: "", image: "new/name.svg",
  icon: "Language", categoryId: null };
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>';

test("card save accepts JSON or a single multipart submission; invalid or oversized uploads are rejected", async () => {
  const json = await submission.readCardSubmission(new Request("http://localhost/api/cards", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  }));
  assert.deepEqual({ ...json.payload }, input);
  const form = new FormData();
  form.set("file", new File([svg], "original.svg", { type: "image/svg+xml" }));
  form.set("card", JSON.stringify(input));
  const parsed = await submission.readCardSubmission(new Request("http://localhost/api/cards", { method: "POST", body: form }));
  assert.deepEqual({ ...parsed.payload }, input);
  assert.equal(parsed.file.name, "original.svg");
  assert.equal(await parsed.file.text(), svg);
  form.set("card", "broken");
  await assert.rejects(submission.readCardSubmission(new Request("http://localhost", { method: "POST", body: form })));
  form.set("card", JSON.stringify(input));
  form.set("file", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.svg", { type: "image/svg+xml" }));
  await assert.rejects(submission.readCardSubmission(new Request("http://localhost", { method: "POST", body: form })),
    /10MB/);
  const chunks = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(10 * 1024 * 1024));
      controller.enqueue(new Uint8Array(65_537));
      controller.close();
    },
  });
  await assert.rejects(submission.readCardSubmission(new Request("http://localhost", {
    method: "POST", headers: { "content-type": "multipart/form-data; boundary=large" }, body: chunks, duplex: "half",
  })), { status: 413 });
});

test("card save finalizes the image inside the content lock and removes it if the database commit fails", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "site-card-transaction-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let rows = [], failCommit = true, held = false;
  const db = {
    select: () => {
      const query = { from: () => query, orderBy: () => query, for: () => Promise.resolve(rows) };
      return query;
    },
    insert: () => ({ values: row => ({ $returningId: async () => { rows.push({ ...row, id: 1 }); return [{ id: 1 }]; } }) }),
    update: () => ({ set: values => ({ where: async () => { Object.assign(rows[0], values); } }) }),
    async transaction(callback) {
      const previous = structuredClone(rows);
      try {
        const result = await callback(db);
        assert.ok(held);
        if (failCommit) throw new Error("Injected DB failure");
        return result;
      } catch (error) { rows = previous; throw error; }
    },
  };
  let uploads = 0, lastFile;
  const store = await load("lib/cards/store.ts", {
    "server-only": {}, "drizzle-orm": { asc: value => value, eq: () => null, inArray: () => null },
    "@/db": { getDb: () => db }, "@/db/schema": { contentCards: { id: "id" }, connectCategories: {} },
    "@/lib/auth/session": { requireEditor: async () => {} }, "@/lib/auth/http": { AuthError },
    "@/lib/cards/icons": { hasMuiIcon: async () => true },
    "@/lib/content-write-lock": { withContentWriteLock: async callback => {
      held = true; try { return await callback(); } finally { held = false; }
    } },
    "@/lib/cards/assets": { createCardImage: async (file, requested) => {
      assert.ok(held);
      uploads++; lastFile = file;
      assert.equal(requested, input.image);
      const destination = path.join(root, "name(1).svg");
      await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
      return { image: "new/name(1).svg", rollback: async () => { assert.ok(held); await fs.unlink(destination); } };
    } },
  });
  const file = new File([svg], "original.svg", { type: "image/svg+xml" });
  await assert.rejects(store.saveCard(input, undefined, file), /Injected DB failure/);
  assert.deepEqual(rows, []);
  assert.deepEqual(await fs.readdir(root), []);
  assert.equal(await file.text(), svg);
  failCommit = false;
  const saved = await store.saveCard(input, undefined, file);
  assert.equal(saved.image, "new/name(1).svg");
  assert.equal(rows[0].image, saved.image);
  assert.equal(uploads, 2);
  assert.equal(lastFile, file);
  assert.equal(await fs.readFile(path.join(root, "name(1).svg"), "utf8"), svg);
  await assert.rejects(store.saveCard(input, 999, file), { status: 404 });
  assert.equal(uploads, 2);
});
