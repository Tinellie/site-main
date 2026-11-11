import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (await readFile(new URL("../src/features/cards/validation.ts", import.meta.url), "utf8"))
  .replace('"../../lib/images/resolve-image-path"', JSON.stringify(new URL("../src/lib/images/resolve-image-path.ts", import.meta.url).href));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { parseCardInput } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

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
