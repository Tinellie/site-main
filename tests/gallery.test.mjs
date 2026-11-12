import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function load(relative) {
  const source = (await readFile(new URL(relative, import.meta.url), "utf8"))
    .replace('"mdast-util-from-markdown"', JSON.stringify(import.meta.resolve("mdast-util-from-markdown")))
    .replace('"micromark-util-decode-string"', JSON.stringify(import.meta.resolve("micromark-util-decode-string")));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);
}

const { parseAssetPath, assetReferencePath, assetUrl } = await load("../src/features/gallery/asset-path.ts");
const { markdownImages, rewriteMarkdownImages, unescapeImageUrl } = await load("../src/lib/images/markdown-images.ts");

test("asset paths round-trip nested names and Unicode without escaping the asset root", () => {
  for (const value of ["photo.png", "new folder/图片 (1).png", "a/b/c.jpeg"]) {
    assert.equal(parseAssetPath(value), value);
    assert.equal(assetReferencePath(assetUrl(value)), value);
  }
  for (const value of ["", null, "../x", "/x", "a//b", "a\\b", "%2e%2e/x", "%252e%252e/x",
    "a%2fb/../x", "a:b", "a?b", "a#b", "a|b", "con.png", "a/NUL", "a/LPT1.txt", "a./b", "a /b"]) {
    assert.throws(() => parseAssetPath(value), String(value));
  }
});

test("image references recognize supported aliases and same-origin URLs only", () => {
  for (const prefix of ["", "assets/", "/assets/", "/images/assets/", "@images/assets/",
    "/api/cards/assets/", "/api/gallery/assets/"]) {
    assert.equal(assetReferencePath(`${prefix}nested/photo.png?version=1#test`), "nested/photo.png");
  }
  assert.equal(assetReferencePath("https://site.test/assets/a.png", "https://site.test"), "a.png");
  assert.equal(assetReferencePath("//site.test/assets/a.png", "https://site.test"), "a.png");
  assert.equal(assetReferencePath("./nested/../a.png"), "a.png");
  assert.equal(assetReferencePath("../outside.png"), null);
  assert.equal(unescapeImageUrl("some&#32;image.png"), "some image.png");
  for (const value of ["https://external.test/assets/a.png", "https://", "data:image/png;base64,test",
    "/images/icons/a.png", "/outside.png", ""]) {
    assert.equal(assetReferencePath(value, "https://site.test"), null, value);
  }
});

test("Markdown destinations include inline, reference and HTML responsive images with exact offsets", () => {
  const source = [
    '![plain](one.png "caption")',
    "![angle](<two words.png>)",
    "![parenthesis](three\\(x\\).png)",
    "![ref][ID]",
    "![collapsed][]",
    "![shortcut]",
    "",
    "[id]: four.png 'caption'",
    "[collapsed]: <five words.png>",
    "[shortcut]: six.png",
    '<img class="x" src="seven.png" data-src="ignored.png">',
    "<img src='eight.png'>",
    '<source srcset="nine.png 1x, ten.png 2x">',
    "<img src=eleven.png>",
  ].join("\n");
  const images = markdownImages(source);
  assert.deepEqual(images.map(image => image.url).sort(), [
    "one.png", "two words.png", "three\\(x\\).png", "four.png", "five words.png", "six.png",
    "seven.png", "eight.png", "nine.png", "ten.png", "eleven.png",
  ].sort());
  for (const image of images) assert.equal(source.slice(image.start, image.end), image.url);
  assert.equal(unescapeImageUrl("three\\(x\\).png"), "three(x).png");
});

test("image extraction excludes links, escaped images, comments and code examples", () => {
  const source = [
    "[link](not-image.png)", "\\![escaped](not-image.png)",
    "`![inline](not-image.png)`", "<!-- <img src='not-image.png'> -->",
    "```md", "![fenced](not-image.png)", "```",
    "~~~html", "<img src='not-image.png'>", "~~~",
    "[unused]: not-image.png", "", "    ![indented](not-image.png)", "",
    "![real](actual.png)",
  ].join("\n");
  assert.deepEqual(markdownImages(source).map(image => image.url), ["actual.png"]);
});

test("nested captions, blockquotes, list images and longer or unclosed fences follow Markdown syntax", () => {
  const source = [
    "![a [nested] caption](nested.png)", "", "> ![quote](quote.png)", "",
    "- ![list](list.png)", "", "````md", "![fenced](ignored.png)", "`````", "",
    "```md", "![unclosed](ignored.png)",
  ].join("\n");
  assert.deepEqual(markdownImages(source).map(image => image.url), ["nested.png", "quote.png", "list.png"]);
});

test("HTML quoted attributes and srcset data URLs cannot create spurious local destinations", () => {
  const source = '<img alt="a > b src=\'fake.png\'" src="actual.png">' +
    '<source srcset=" data:image/png;base64,AAAA 1x, second.png 2x, third.png, ">';
  assert.deepEqual(markdownImages(source).map(image => image.url), [
    "actual.png", "data:image/png;base64,AAAA", "second.png", "third.png",
  ]);
  const quote = "> ![image][id]\n>\n> [id]:\n>   quoted.png";
  assert.deepEqual(markdownImages(quote).map(image => image.url), ["quoted.png"]);
});

test("rewrites preserve captions, markup, non-image links and unrelated destinations", () => {
  const source = '![a](old.png "title") ![b][same]\n\n[same]: <old.png>\n' +
    '<img alt="old.png" src="old.png"><source srcset="old.png 1x, other.png 2x">\n[link](old.png)';
  const result = rewriteMarkdownImages(source, url => url === "old.png" ? "/assets/new%20image.png" : null);
  assert.equal(result, '![a](/assets/new%20image.png "title") ![b][same]\n\n[same]: </assets/new%20image.png>\n' +
    '<img alt="old.png" src="/assets/new%20image.png"><source srcset="/assets/new%20image.png 1x, other.png 2x">\n[link](old.png)');
});
