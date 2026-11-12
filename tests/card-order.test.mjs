import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/cards/store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const lockSource = await readFile(new URL("../src/lib/content-write-lock.ts", import.meta.url), "utf8");
const lockCode = ts.transpileModule(lockSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(initial) {
  let rows = structuredClone(initial);
  let authenticated = true;
  const updates = [];
  const schema = {
    contentCards: Object.fromEntries(["id", "kind", "categoryId", "position"].map(key => [key, key])),
    connectCategories: {},
  };
  class AuthError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }
  const db = {
    select() {
      let predicate = () => true;
      let order = [];
      const query = {
        from() { return query; },
        where(value) { predicate = value; return query; },
        orderBy(...keys) { order = keys; return query; },
        for() { return query; },
        then(resolve, reject) {
          return Promise.resolve(rows.filter(predicate).map(row => ({ ...row })).sort((a, b) => {
            for (const key of order) if (a[key] !== b[key]) return a[key] - b[key];
            return 0;
          })).then(resolve, reject);
        },
      };
      return query;
    },
    update() {
      return { set: values => ({ where: async predicate => {
        for (const row of rows.filter(predicate)) {
          updates.push({ id: row.id, values: { ...values } });
          Object.assign(row, values);
        }
      } }) };
    },
    insert() {
      return { values: input => ({ $returningId: async () => {
        const id = Math.max(0, ...rows.map(row => row.id)) + 1;
        rows.push({ ...input, id });
        return [{ id }];
      } }) };
    },
    async transaction(write) {
      const previous = structuredClone(rows);
      try { return await write(db); }
      catch (error) { rows = previous; throw error; }
    },
  };
  const lockExports = {};
  runInNewContext(lockCode, { exports: lockExports, require: () => ({}) });
  const exports = {};
  const imports = {
    "server-only": {},
    "drizzle-orm": {
      asc: key => key, eq: (key, value) => row => row[key] === value,
      inArray: (key, values) => row => values.includes(row[key]),
    },
    "@/db": { getDb: () => db },
    "@/db/schema": schema,
    "@/lib/auth/session": { requireEditor: async () => {
      if (!authenticated) throw new AuthError("Unauthorized", 401);
    } },
    "@/lib/auth/http": { AuthError },
    "@/lib/cards/icons": { hasMuiIcon: async () => true },
    "@/lib/content-write-lock": lockExports,
  };
  runInNewContext(compiled, { exports, require(name) {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return {
    ...exports, updates, rows: () => rows,
    logout: () => { authenticated = false; },
  };
}

const card = (id, kind, categoryId = null, position = id) => ({
  id, kind, categoryId, position, title: `Card ${id}`, username: "", link: "/",
  description: "", image: "", icon: "Language",
});
const ids = rows => Array.from(rows, row => row.id);

test("card moves persist one adjacent step, stay within a category and can be reversed", async () => {
  const s = setup([card(1, "connect"), card(2, "connect"), card(3, "connect"),
    card(4, "connect", 7), card(5, "project")]);
  assert.deepEqual(ids(await s.moveCard(2, "up")), [2, 1, 3, 4]);
  assert.deepEqual(ids(await s.listCards("connect")), [2, 1, 3, 4]);
  assert.deepEqual(ids(await s.moveCard(2, "down")), [1, 2, 3, 4]);
  assert.ok(s.updates.every(update => update.id <= 3));
  assert.equal(s.rows().find(row => row.id === 4).position, 4);
});

test("Works projects and articles never exchange positions across sections", async () => {
  const s = setup([card(1, "project"), card(2, "article"), card(3, "project"), card(4, "article")]);
  const result = await s.moveCard(3, "up");
  assert.deepEqual(ids(result.filter(row => row.kind === "project")), [3, 1]);
  assert.deepEqual(ids(result.filter(row => row.kind === "article")), [2, 4]);
  await assert.rejects(s.moveCard(2, "up"), { status: 409 });
  await assert.rejects(s.moveCard(4, "down"), { status: 409 });
});

test("duplicate positions remain movable after categories merge", async () => {
  const s = setup([card(1, "connect", null, 0), card(2, "connect", null, 0), card(3, "connect", null, 0)]);
  assert.deepEqual(ids(await s.moveCard(2, "up")), [2, 1, 3]);
  assert.deepEqual(Array.from(await s.listCards("connect"), row => row.position), [1, 2, 3]);
});

test("boundaries, missing cards and guests fail without changing rows", async () => {
  const initial = [card(1, "connect"), card(2, "connect", 7)];
  const s = setup(initial);
  await assert.rejects(s.moveCard(1, "up"), { status: 409 });
  await assert.rejects(s.moveCard(2, "down"), { status: 409 });
  await assert.rejects(s.moveCard(999, "up"), { status: 404 });
  s.logout();
  await assert.rejects(s.moveCard(1, "down"), { status: 401 });
  assert.deepEqual(s.rows(), initial);
  assert.equal(s.updates.length, 0);
});

test("edits preserve order and new or reclassified cards append", async () => {
  const initial = [card(1, "project", null, 9), card(2, "article", null, 3)];
  const s = setup(initial);
  const { id, position, ...input } = initial[0];
  assert.equal((await s.saveCard({ ...input, title: "Edited" }, id)).position, position);
  assert.equal((await s.saveCard(input)).position, 10);
  assert.equal((await s.saveCard({ ...input, kind: "article" }, id)).position, 11);
  assert.deepEqual(ids((await s.listCards("works")).filter(row => row.kind === "article")), [2, 1]);
});
