import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = (await readFile(new URL("../src/lib/images/svg.ts", import.meta.url), "utf8"))
  .replace('"saxes"', JSON.stringify(import.meta.resolve("saxes")));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { validateSvg, SVG_CONTENT_SECURITY_POLICY } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`;
const bytes = source => Buffer.from(source);

test("SVG accepts vector shapes, inline styles, gradients and local references", () => {
  for (const source of [
    svg('<path d="M0 0h32v32z" fill="red"/>'),
    `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\n<!-- logo -->${svg('<text>图标 &amp; logo</text>')}`,
    svg('<style>.mark { fill: red; }</style><rect class="mark" width="32" height="32"/>'),
    svg('<defs><linearGradient id="g"><stop stop-color="red"/></linearGradient><path id="p"/></defs><use href="#p" fill="url(#g)"/>'),
    svg('<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#p"/>'),
  ]) assert.doesNotThrow(() => validateSvg(bytes(source)));
});

test("SVG rejects malformed XML, other documents, DTDs and executable content", () => {
  for (const source of [
    "", "<html/>", "<svg/>", svg("<path>"), `${svg("")}${svg("")}`,
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + svg("&x;"),
    svg("<script>alert(1)</script>"), svg('<foreignObject><div/></foreignObject>'),
    svg('<path onclick="alert(1)"/>'), svg('<svg onload="alert(1)"/>'),
    svg('<use href="https://external.test/a.svg#p"/>'),
    svg('<a href="javascript:alert(1)"><path/></a>'),
    svg('<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://external.test/a"/>'),
    svg("&unknown;"),
  ]) assert.throws(() => validateSvg(bytes(source)), source);
  assert.throws(() => validateSvg(Uint8Array.from([0xff, 0xfe, 0x00])));
});

test("SVG responses permit styling but sandbox active content and block external resources", () => {
  assert.match(SVG_CONTENT_SECURITY_POLICY, /default-src 'none'/);
  assert.match(SVG_CONTENT_SECURITY_POLICY, /style-src 'unsafe-inline'/);
  assert.match(SVG_CONTENT_SECURITY_POLICY, /sandbox/);
  assert.doesNotMatch(SVG_CONTENT_SECURITY_POLICY, /allow-scripts|allow-same-origin/);
});
