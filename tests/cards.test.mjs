import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (await readFile(new URL("../src/features/cards/validation.ts", import.meta.url), "utf8"))
  .replace('"../../lib/images/resolve-image-path"', JSON.stringify(new URL("../src/lib/images/resolve-image-path.ts", import.meta.url).href));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { parseCardInput, parseCategoryName, parseCategoryMutation } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

const card = { kind: "connect", title: "Test", username: "user", link: "https://example.com", description: "", image: "", icon: "GitHub" };

test("card fields are trimmed and valid kinds and image paths are preserved", () => {
  for (const kind of ["connect", "project", "article"]) {
    const result = parseCardInput({ ...card, kind, title: " Test ", image: "nested/photo.png" });
    assert.equal(result.title, "Test");
    assert.equal(result.kind, kind);
    assert.equal(result.image, "nested/photo.png");
  }
  for (const link of ["/blog/1", "https://example.com/a", "mailto:test@example.com"]) {
    assert.equal(parseCardInput({ ...card, link }).link, link);
  }
});

test("unsafe links, escaping image paths and invalid fields are rejected", () => {
  for (const link of ["javascript:alert(1)", "//evil.test", "/\\evil.test", "not a url", "data:text/html,test"]) {
    assert.throws(() => parseCardInput({ ...card, link }));
  }
  for (const image of ["../a.png", "%2e%2e/a.png", "@images/icons/a.png", "/assets/a.png", "a\\b.png"]) {
    assert.throws(() => parseCardInput({ ...card, image }));
  }
  for (const invalid of [{ kind: "unknown" }, { title: "" }, { title: "x".repeat(201) }, { icon: "../GitHub" }, { link: null }]) {
    assert.throws(() => parseCardInput({ ...card, ...invalid }));
  }
  assert.throws(() => parseCardInput(null));
});

test("Connect cards accept existing-category identifiers and default to the top-level group", () => {
  assert.equal(parseCardInput(card).categoryId, null);
  assert.equal(parseCardInput({ ...card, categoryId: null }).categoryId, null);
  assert.equal(parseCardInput({ ...card, categoryId: 12 }).categoryId, 12);
  for (const categoryId of ["12", "", 0, -1, 0.5, 2147483648, {}, true]) {
    assert.throws(() => parseCardInput({ ...card, categoryId }));
  }
  for (const kind of ["project", "article"]) {
    assert.throws(() => parseCardInput({ ...card, kind, categoryId: 12 }));
    assert.equal(parseCardInput({ ...card, kind }).categoryId, null);
  }
});

test("category names and reordering actions are validated", () => {
  assert.equal(parseCategoryName({ name: "  Social  " }), "Social");
  assert.equal(parseCategoryName({ name: "分类" }), "分类");
  assert.deepEqual(parseCategoryMutation({ name: "  New  " }), { name: "New" });
  for (const direction of ["up", "down"]) {
    assert.deepEqual(parseCategoryMutation({ direction }), { direction });
  }
  for (const input of [null, {}, { name: "" }, { name: "   " }, { name: 1 }, { name: "a".repeat(101) }]) {
    assert.throws(() => parseCategoryName(input));
  }
  for (const input of [null, {}, { direction: "side" }, { direction: 1 }, { direction: "up", name: "New" }]) {
    assert.throws(() => parseCategoryMutation(input));
  }
});
